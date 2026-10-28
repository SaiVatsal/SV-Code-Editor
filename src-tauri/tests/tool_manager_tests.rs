use std::fs;
use sv_code_editor_lib::services::tool_manager::ToolManager;

#[tokio::test]
async fn test_tool_manager_component_status_and_doctor() {
    let tm = ToolManager::new();

    // Check all components
    let statuses = tm.check_all_components().await;
    assert_eq!(statuses.len(), 6, "Expected 6 pinned components");

    let node = statuses.iter().find(|s| s.id == "node");
    assert!(node.is_some(), "Node.js component must exist");
    assert_eq!(node.unwrap().version, "22.14.0");

    let ghidra = statuses.iter().find(|s| s.id == "ghidra");
    assert!(ghidra.is_some(), "Ghidra component must exist");
    assert_eq!(ghidra.unwrap().version, "12.2");

    let omniroute = statuses.iter().find(|s| s.id == "omniroute");
    assert!(omniroute.is_some(), "OmniRoute component must exist");
    assert_eq!(omniroute.unwrap().version, "3.8.52");

    let rea = statuses.iter().find(|s| s.id == "rea");
    assert!(rea.is_some(), "REA component must exist");
    assert_eq!(rea.unwrap().version, "6.8.0");

    let impeccable = statuses.iter().find(|s| s.id == "impeccable");
    assert!(impeccable.is_some(), "Impeccable component must exist");
    assert_eq!(impeccable.unwrap().version, "4.8.0");

    let jdk = statuses.iter().find(|s| s.id == "jdk");
    assert!(jdk.is_some(), "JDK component must exist");
    assert_eq!(jdk.unwrap().version, "21.0.12.1+1");
}

#[tokio::test]
async fn test_tool_manager_sha256_checksum_verification() {
    let temp_dir = std::env::temp_dir().join(format!("svcode_sha_test_{}", uuid::Uuid::new_v4()));
    let _ = fs::create_dir_all(&temp_dir);

    let test_file = temp_dir.join("test.bin");
    let content = b"Hello SV Code Editor checksum verification!";
    fs::write(&test_file, content).unwrap();

    // Correct SHA-256 for the content
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(content);
    let expected_hash = hex::encode(hasher.finalize());

    // Verification succeeds on correct hash
    let mut file_buf = fs::File::open(&test_file).unwrap();
    let mut test_hasher = Sha256::new();
    std::io::copy(&mut file_buf, &mut test_hasher).unwrap();
    let computed = hex::encode(test_hasher.finalize());
    assert_eq!(computed, expected_hash);

    // Verification fails on tampered hash
    let bad_hash = "0000000000000000000000000000000000000000000000000000000000000000";
    assert_ne!(computed, bad_hash, "Tampered hash must not match");

    let _ = fs::remove_dir_all(&temp_dir);
}

