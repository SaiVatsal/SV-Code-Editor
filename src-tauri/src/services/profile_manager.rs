use crate::models::{HardwareInfo, ProcessMemoryEntry, SystemProfile};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, Pid, ProcessRefreshKind, RefreshKind, System};
use tokio::sync::RwLock;
use tracing::{info, warn};

pub struct ProfileManager {
    system: Arc<RwLock<System>>,
    active_profile: Arc<RwLock<SystemProfile>>,
    startup_instant: Instant,
    watchdog_running: Arc<AtomicBool>,
}

impl Default for ProfileManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ProfileManager {
    pub fn new() -> Self {
        let mut sys = System::new_with_specifics(
            RefreshKind::nothing()
                .with_memory(MemoryRefreshKind::everything())
                .with_cpu(CpuRefreshKind::everything())
                .with_processes(ProcessRefreshKind::everything()),
        );
        sys.refresh_all();

        let total_ram_mb = sys.total_memory() / (1024 * 1024);
        let recommended = if total_ram_mb <= 3072 {
            SystemProfile::Lite
        } else if total_ram_mb <= 8192 {
            SystemProfile::Standard
        } else {
            SystemProfile::Full
        };

        info!(
            "Hardware detected: total_ram={} MB, cores={}, recommended_profile={:?}",
            total_ram_mb,
            sys.cpus().len(),
            recommended
        );

        Self {
            system: Arc::new(RwLock::new(sys)),
            active_profile: Arc::new(RwLock::new(recommended)),
            startup_instant: Instant::now(),
            watchdog_running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn startup_duration_ms(&self) -> u64 {
        self.startup_instant.elapsed().as_millis() as u64
    }

    pub async fn get_hardware_info(&self) -> HardwareInfo {
        let mut sys = self.system.write().await;
        sys.refresh_memory();
        sys.refresh_cpu_usage();

        let total_ram_mb = sys.total_memory() / (1024 * 1024);
        let available_ram_mb = sys.available_memory() / (1024 * 1024);
        let cpu_cores = sys.cpus().len();
        let cpu_brand = sys.cpus().first().map(|c| c.brand().to_string()).unwrap_or_else(|| "Unknown CPU".into());

        let recommended = if total_ram_mb <= 3072 {
            SystemProfile::Lite
        } else if total_ram_mb <= 8192 {
            SystemProfile::Standard
        } else {
            SystemProfile::Full
        };

        let active = self.active_profile.read().await.clone();

        HardwareInfo {
            total_ram_mb,
            available_ram_mb,
            cpu_cores,
            cpu_brand,
            recommended_profile: recommended,
            active_profile: active,
        }
    }

    pub async fn set_profile(&self, profile: SystemProfile) {
        let mut p = self.active_profile.write().await;
        *p = profile;
    }

    pub async fn get_active_profile(&self) -> SystemProfile {
        self.active_profile.read().await.clone()
    }

    /// Return process list for Process Monitor panel
    pub async fn get_process_monitor_entries(&self) -> Vec<ProcessMemoryEntry> {
        let mut sys = self.system.write().await;
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let mut entries = Vec::new();
        let current_pid = std::process::id();

        for (pid, process) in sys.processes() {
            let pid_u32 = pid.as_u32();
            let name = process.name().to_string_lossy().to_string();
            let mem_mb = (process.memory() as f64) / (1024.0 * 1024.0);
            let cpu = process.cpu_usage();

            // Match our tracked components
            let is_svcode = pid_u32 == current_pid || name.contains("svcode") || name.contains("SV Code Editor");
            let is_webview = name.contains("msedgewebview2") || name.contains("WebView2");
            let is_node = name.contains("node");
            let is_java = name.contains("java");
            let is_lsp = name.contains("language-server") || name.contains("pyright") || name.contains("rust-analyzer") || name.contains("clangd");
            let is_rg = name.contains("rg");
            let is_git = name.contains("git");

            if is_svcode {
                entries.push(ProcessMemoryEntry {
                    name: format!("SV Code Editor Core (PID {})", pid_u32),
                    category: "core".into(),
                    pid: Some(pid_u32),
                    memory_mb: (mem_mb * 100.0).round() / 100.0,
                    cpu_percent: (cpu * 10.0).round() / 10.0,
                    status: "running".into(),
                    can_stop: false,
                });
            } else if is_webview {
                entries.push(ProcessMemoryEntry {
                    name: format!("WebView2 Renderer (PID {})", pid_u32),
                    category: "ui-renderer".into(),
                    pid: Some(pid_u32),
                    memory_mb: (mem_mb * 100.0).round() / 100.0,
                    cpu_percent: (cpu * 10.0).round() / 10.0,
                    status: "running".into(),
                    can_stop: false,
                });
            } else if is_lsp {
                entries.push(ProcessMemoryEntry {
                    name: format!("Language Server: {} (PID {})", name, pid_u32),
                    category: "language-server".into(),
                    pid: Some(pid_u32),
                    memory_mb: (mem_mb * 100.0).round() / 100.0,
                    cpu_percent: (cpu * 10.0).round() / 10.0,
                    status: "running".into(),
                    can_stop: true,
                });
            } else if is_java {
                entries.push(ProcessMemoryEntry {
                    name: format!("Ghidra / JVM Backend (PID {})", pid_u32),
                    category: "reverse-engineering".into(),
                    pid: Some(pid_u32),
                    memory_mb: (mem_mb * 100.0).round() / 100.0,
                    cpu_percent: (cpu * 10.0).round() / 10.0,
                    status: "running".into(),
                    can_stop: true,
                });
            } else if is_node && (name.contains("omniroute") || name.contains("rea")) {
                entries.push(ProcessMemoryEntry {
                    name: format!("AI / RE Gateway (PID {})", pid_u32),
                    category: "gateway".into(),
                    pid: Some(pid_u32),
                    memory_mb: (mem_mb * 100.0).round() / 100.0,
                    cpu_percent: (cpu * 10.0).round() / 10.0,
                    status: "running".into(),
                    can_stop: true,
                });
            } else if is_rg || is_git {
                entries.push(ProcessMemoryEntry {
                    name: format!("Worker: {} (PID {})", name, pid_u32),
                    category: "worker".into(),
                    pid: Some(pid_u32),
                    memory_mb: (mem_mb * 100.0).round() / 100.0,
                    cpu_percent: (cpu * 10.0).round() / 10.0,
                    status: "running".into(),
                    can_stop: true,
                });
            }
        }

        entries
    }

    /// Kill an individual process by PID
    pub async fn kill_process(&self, pid: u32) -> Result<(), String> {
        let mut sys = self.system.write().await;
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
        if let Some(process) = sys.process(Pid::from_u32(pid)) {
            if process.kill() {
                Ok(())
            } else {
                Err(format!("Could not terminate process with PID {}", pid))
            }
        } else {
            Err(format!("Process with PID {} not found", pid))
        }
    }

    /// Start background memory watchdog
    pub fn start_watchdog<F>(&self, low_memory_callback: F)
    where
        F: Fn(u64) + Send + Sync + 'static,
    {
        if self.watchdog_running.swap(true, Ordering::SeqCst) {
            return; // already running
        }

        let system_arc = self.system.clone();
        let profile_arc = self.active_profile.clone();
        let running_flag = self.watchdog_running.clone();

        tokio::spawn(async move {
            info!("Memory watchdog started");
            while running_flag.load(Ordering::SeqCst) {
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

                let (available_mb, threshold_mb) = {
                    let mut sys = system_arc.write().await;
                    sys.refresh_memory();
                    let avail = sys.available_memory() / (1024 * 1024);
                    let profile = profile_arc.read().await.clone();
                    let threshold = match profile {
                        SystemProfile::Lite => 250,      // Alert under 250 MB
                        SystemProfile::Standard => 500,  // Alert under 500 MB
                        SystemProfile::Full => 800,      // Alert under 800 MB
                    };
                    (avail, threshold)
                };

                if available_mb < threshold_mb {
                    warn!(
                        "Low memory condition detected: {} MB available (threshold: {} MB)",
                        available_mb, threshold_mb
                    );
                    low_memory_callback(available_mb);
                }
            }
        });
    }

    pub fn stop_watchdog(&self) {
        self.watchdog_running.store(false, Ordering::SeqCst);
    }
}

