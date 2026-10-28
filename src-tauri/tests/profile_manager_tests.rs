use sv_code_editor_lib::models::SystemProfile;
use sv_code_editor_lib::services::profile_manager::ProfileManager;

#[tokio::test]
async fn test_profile_manager_hardware_and_profile_selection() {
    let pm = ProfileManager::new();

    // Check hardware info
    let hw = pm.get_hardware_info().await;
    assert!(hw.cpu_cores > 0, "CPU cores should be greater than 0");
    assert!(hw.total_ram_mb > 0, "Total RAM should be greater than 0");

    // Profile check
    let active = pm.get_active_profile().await;
    match active {
        SystemProfile::Lite => {
            assert!(hw.total_ram_mb <= 3072, "Lite profile should be chosen for <= 3GB");
        }
        SystemProfile::Standard => {
            assert!(hw.total_ram_mb > 3072 && hw.total_ram_mb <= 8192);
        }
        SystemProfile::Full => {
            assert!(hw.total_ram_mb > 8192);
        }
    }

    // Override profile to Lite
    pm.set_profile(SystemProfile::Lite).await;
    assert_eq!(pm.get_active_profile().await, SystemProfile::Lite);

    // Override profile to Full
    pm.set_profile(SystemProfile::Full).await;
    assert_eq!(pm.get_active_profile().await, SystemProfile::Full);
}

#[tokio::test]
async fn test_profile_manager_memory_breakdown() {
    let pm = ProfileManager::new();
    let entries = pm.get_process_monitor_entries().await;

    // Must have at least 1 entry for current running process or subcomponents
    assert!(!entries.is_empty(), "Process monitor entries should not be empty");
    let current_entry = &entries[0];
    assert!(current_entry.memory_mb > 0.0, "Memory usage should be positive");
}

#[test]
fn test_startup_duration() {
    let pm = ProfileManager::new();
    let duration = pm.startup_duration_ms();
    assert!(duration < 5000, "Cold startup duration should be within 5000 ms");
}

