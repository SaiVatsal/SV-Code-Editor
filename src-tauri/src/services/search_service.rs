use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    pub file_path: String,
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
}

pub struct SearchService {
    rg_bin: Option<PathBuf>,
}

impl Default for SearchService {
    fn default() -> Self {
        Self::new()
    }
}

impl SearchService {
    pub fn new() -> Self {
        let rg_bin = which::which("rg").ok();
        Self { rg_bin }
    }

    pub fn search<F>(
        &self,
        root_dir: &Path,
        query: &str,
        case_sensitive: bool,
        is_regex: bool,
        max_results: usize,
        match_cb: F,
    ) -> Result<usize, String>
    where
        F: Fn(SearchMatch) -> bool, // returns false to stop early
    {
        let bin = self.rg_bin.as_ref().ok_or_else(|| "ripgrep (rg) is not installed on system PATH".to_string())?;

        let mut cmd = Command::new(bin);
        cmd.current_dir(root_dir)
            .arg("--vimgrep")
            .arg("--no-heading");

        if !case_sensitive {
            cmd.arg("-i");
        }
        if !is_regex {
            cmd.arg("-F");
        }

        cmd.arg(query)
            .arg(".")
            .stdout(Stdio::piped())
            .stderr(Stdio::null());

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn ripgrep: {}", e))?;
        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let reader = BufReader::new(stdout);

        let mut count = 0;

        for line_res in reader.lines() {
            if count >= max_results {
                let _ = child.kill();
                break;
            }
            if let Ok(line) = line_res {
                // Format: path:line:col:content
                let parts: Vec<&str> = line.splitn(4, ':').collect();
                if parts.len() == 4 {
                    let file_path = parts[0].to_string();
                    let line_number = parts[1].parse::<usize>().unwrap_or(1);
                    let col_number = parts[2].parse::<usize>().unwrap_or(1);
                    let line_content = parts[3].to_string();

                    let m = SearchMatch {
                        file_path,
                        line_number,
                        line_content,
                        match_start: col_number.saturating_sub(1),
                        match_end: col_number.saturating_sub(1) + query.len(),
                    };

                    count += 1;
                    if !match_cb(m) {
                        let _ = child.kill();
                        break;
                    }
                }
            }
        }

        info!("Search completed with {} results", count);
        Ok(count)
    }
}

