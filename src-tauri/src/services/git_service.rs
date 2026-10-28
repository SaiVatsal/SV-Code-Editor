use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tracing::{info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFileStatus {
    pub path: String,
    pub status: String, // "modified", "untracked", "staged", "deleted", "renamed", "conflict"
    pub staged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRepoStatus {
    pub is_repo: bool,
    pub current_branch: String,
    pub tracking_branch: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub files: Vec<GitFileStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitWorktreeInfo {
    pub task_id: String,
    pub branch: String,
    pub path: String,
    pub is_active: bool,
    pub commit_hash: String,
}

pub struct GitService {
    git_bin: Option<PathBuf>,
}

impl Default for GitService {
    fn default() -> Self {
        Self::new()
    }
}

impl GitService {
    pub fn new() -> Self {
        let git_bin = which::which("git").ok();
        Self { git_bin }
    }

    pub fn is_git_available(&self) -> bool {
        self.git_bin.is_some()
    }

    fn run_git(&self, repo_dir: &Path, args: &[&str]) -> Result<String, String> {
        let bin = self.git_bin.as_ref().ok_or_else(|| "Git is not installed or not found on PATH".to_string())?;

        let output = Command::new(bin)
            .current_dir(repo_dir)
            .args(args)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Err(if !stderr.is_empty() { stderr } else { stdout })
        }
    }

    pub fn get_status(&self, repo_dir: &Path) -> Result<GitRepoStatus, String> {
        if !repo_dir.join(".git").exists() && !self.run_git(repo_dir, &["rev-parse", "--is-inside-work-tree"]).is_ok() {
            return Ok(GitRepoStatus {
                is_repo: false,
                current_branch: "".into(),
                tracking_branch: None,
                ahead: 0,
                behind: 0,
                files: vec![],
            });
        }

        let branch = self.run_git(repo_dir, &["branch", "--show-current"])
            .unwrap_or_else(|_| "HEAD".into());

        let raw_status = self.run_git(repo_dir, &["status", "--porcelain=v1"])?;
        let mut files = Vec::new();

        for line in raw_status.lines() {
            if line.len() < 3 {
                continue;
            }
            let index_status = &line[0..1];
            let worktree_status = &line[1..2];
            let path = line[3..].trim().to_string();

            if index_status == "U" || worktree_status == "U" || (index_status == "A" && worktree_status == "A") {
                files.push(GitFileStatus {
                    path: path.clone(),
                    status: "conflict".into(),
                    staged: false,
                });
            } else {
                if index_status != " " && index_status != "?" {
                    files.push(GitFileStatus {
                        path: path.clone(),
                        status: match index_status {
                            "M" => "modified",
                            "A" => "added",
                            "D" => "deleted",
                            "R" => "renamed",
                            _ => "staged",
                        }.into(),
                        staged: true,
                    });
                }
                if worktree_status != " " {
                    files.push(GitFileStatus {
                        path: path.clone(),
                        status: match worktree_status {
                            "?" => "untracked",
                            "M" => "modified",
                            "D" => "deleted",
                            _ => "changed",
                        }.into(),
                        staged: false,
                    });
                }
            }
        }

        Ok(GitRepoStatus {
            is_repo: true,
            current_branch: branch,
            tracking_branch: None,
            ahead: 0,
            behind: 0,
            files,
        })
    }

    pub fn stage_file(&self, repo_dir: &Path, file_path: &str) -> Result<(), String> {
        self.run_git(repo_dir, &["add", file_path])?;
        Ok(())
    }

    pub fn unstage_file(&self, repo_dir: &Path, file_path: &str) -> Result<(), String> {
        self.run_git(repo_dir, &["restore", "--staged", file_path])?;
        Ok(())
    }

    pub fn commit(&self, repo_dir: &Path, message: &str) -> Result<String, String> {
        self.run_git(repo_dir, &["commit", "-m", message])
    }

    pub fn get_diff(&self, repo_dir: &Path, file_path: Option<&str>, staged: bool) -> Result<String, String> {
        let mut args = vec!["diff"];
        if staged {
            args.push("--staged");
        }
        if let Some(f) = file_path {
            args.push("--");
            args.push(f);
        }
        self.run_git(repo_dir, &args)
    }

    pub fn stash_push(&self, repo_dir: &Path, message: Option<&str>) -> Result<String, String> {
        let mut args = vec!["stash", "push"];
        if let Some(msg) = message {
            args.push("-m");
            args.push(msg);
        }
        self.run_git(repo_dir, &args)
    }

    pub fn stash_pop(&self, repo_dir: &Path) -> Result<String, String> {
        self.run_git(repo_dir, &["stash", "pop"])
    }

    // Worktree Isolation Support
    pub fn create_worktree(
        &self,
        repo_dir: &Path,
        task_id: &str,
        base_branch: &str,
        untracked_files_to_copy: &[String],
    ) -> Result<PathBuf, String> {
        let worktree_dir = repo_dir.join(".sv").join("worktrees").join(task_id);
        if let Some(parent) = worktree_dir.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let branch_name = format!("agent/{}", task_id);
        let worktree_str = worktree_dir.to_string_lossy().to_string();

        info!("Creating git worktree at {} on branch {}", worktree_str, branch_name);

        self.run_git(repo_dir, &["worktree", "add", "-b", &branch_name, &worktree_str, base_branch])?;

        // Copy approved untracked files (.env etc)
        for rel_file in untracked_files_to_copy {
            let src = repo_dir.join(rel_file);
            let dst = worktree_dir.join(rel_file);
            if src.exists() {
                if let Some(parent) = dst.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                let _ = fs::copy(&src, &dst);
            }
        }

        Ok(worktree_dir)
    }

    pub fn list_worktrees(&self, repo_dir: &Path) -> Result<Vec<GitWorktreeInfo>, String> {
        let output = self.run_git(repo_dir, &["worktree", "list", "--porcelain"])?;
        let mut worktrees = Vec::new();

        let mut current_path = String::new();
        let mut current_commit = String::new();
        let mut current_branch = String::new();

        for line in output.lines() {
            if let Some(path) = line.strip_prefix("worktree ") {
                current_path = path.trim().to_string();
            } else if let Some(commit) = line.strip_prefix("HEAD ") {
                current_commit = commit.trim().to_string();
            } else if let Some(branch) = line.strip_prefix("branch ") {
                current_branch = branch.trim().strip_prefix("refs/heads/").unwrap_or(branch).to_string();
            } else if line.is_empty() {
                if !current_path.is_empty() {
                    let task_id = if current_path.contains(".sv/worktrees/") || current_path.contains(".sv\\worktrees\\") {
                        Path::new(&current_path).file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default()
                    } else {
                        "main".to_string()
                    };

                    worktrees.push(GitWorktreeInfo {
                        task_id,
                        branch: current_branch.clone(),
                        path: current_path.clone(),
                        is_active: true,
                        commit_hash: current_commit.clone(),
                    });
                }
                current_path.clear();
                current_commit.clear();
                current_branch.clear();
            }
        }

        Ok(worktrees)
    }

    pub fn merge_worktree(&self, repo_dir: &Path, task_id: &str, target_branch: &str) -> Result<String, String> {
        let branch_name = format!("agent/{}", task_id);
        // Switch to target branch and merge
        self.run_git(repo_dir, &["checkout", target_branch])?;
        let merge_res = self.run_git(repo_dir, &["merge", "--no-ff", "-m", &format!("Merge agent task {}", task_id), &branch_name]);

        // Clean up worktree and branch
        let _ = self.discard_worktree(repo_dir, task_id);
        let _ = self.run_git(repo_dir, &["branch", "-d", &branch_name]);

        merge_res
    }

    pub fn discard_worktree(&self, repo_dir: &Path, task_id: &str) -> Result<(), String> {
        let worktree_dir = repo_dir.join(".sv").join("worktrees").join(task_id);
        let worktree_str = worktree_dir.to_string_lossy().to_string();

        let _ = self.run_git(repo_dir, &["worktree", "remove", "--force", &worktree_str]);
        if worktree_dir.exists() {
            let _ = fs::remove_dir_all(&worktree_dir);
        }

        let branch_name = format!("agent/{}", task_id);
        let _ = self.run_git(repo_dir, &["branch", "-D", &branch_name]);

        Ok(())
    }

    /// Reconcile orphaned worktrees on startup
    pub fn reconcile_orphaned_worktrees(&self, repo_dir: &Path) {
        info!("Reconciling orphaned worktrees in {:?}", repo_dir);
        let _ = self.run_git(repo_dir, &["worktree", "prune"]);

        let worktrees_dir = repo_dir.join(".sv").join("worktrees");
        if let Ok(entries) = fs::read_dir(&worktrees_dir) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() {
                        let path = entry.path();
                        let path_str = path.to_string_lossy().to_string();
                        warn!("Cleaning up orphaned worktree directory: {}", path_str);
                        let _ = fs::remove_dir_all(&path);
                    }
                }
            }
        }
    }
}

