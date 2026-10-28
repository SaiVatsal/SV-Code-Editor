use std::fs;
use sv_code_editor_lib::services::rea_service::ReaService;

#[test]
fn test_re_service_analyze_binary_and_notes() {
    let re_service = ReaService::new();
    let temp_dir = std::env::temp_dir().join(format!("svcode_re_test_{}", uuid::Uuid::new_v4()));
    let _ = fs::create_dir_all(&temp_dir);

    // Create a mock PE executable (MZ header + PE signature + .text and .data section headers)
    let bin_path = temp_dir.join("sample.exe");
    let mut mock_pe = vec![0u8; 1024];
    // MZ header
    mock_pe[0] = b'M';
    mock_pe[1] = b'Z';
    // e_lfanew at 0x3C pointing to 0x80
    mock_pe[0x3C] = 0x80;
    // PE signature at 0x80
    mock_pe[0x80] = b'P';
    mock_pe[0x81] = b'E';
    mock_pe[0x82] = 0;
    mock_pe[0x83] = 0;
    // Number of sections at 0x86 (2 sections)
    mock_pe[0x86] = 2;
    // SizeOfOptionalHeader at 0x94 (0xF0)
    mock_pe[0x94] = 0xF0;
    // Section headers begin at pe_offset + 4 (PE sig) + 20 (COFF header) + 0xF0 (Opt header) = 0x188
    let sec1_offset = 0x188;
    mock_pe[sec1_offset..sec1_offset + 5].copy_from_slice(b".text");
    let sec2_offset = sec1_offset + 40;
    mock_pe[sec2_offset..sec2_offset + 5].copy_from_slice(b".data");

    fs::write(&bin_path, &mock_pe).unwrap();

    let overview = re_service.analyze_binary_overview(&bin_path).expect("PE analysis must succeed");
    assert!(overview.format.contains("PE"));
    assert_eq!(overview.file_size, 1024);
    assert!(!overview.sha256.is_empty(), "SHA-256 must be computed");
    assert!(overview.sections.len() >= 2, "Should find at least .text and .data sections");
    assert!(overview.sections.iter().any(|s| s.name.contains(".text")));
    assert!(overview.sections.iter().any(|s| s.name.contains(".data")));

    // Test evidence drawer & notes saving
    let sample_notes = "Found entry point at 0x140001000. Verified safe loop.";
    let save_res = re_service.save_notes(&temp_dir, &overview.sha256, sample_notes);
    assert!(save_res.is_ok(), "Saving notes should succeed");

    let notes_file = temp_dir.join(".sv").join("re").join(&overview.sha256).join("notes.json");
    assert!(notes_file.exists());
    let loaded = fs::read_to_string(&notes_file).unwrap();
    assert_eq!(loaded, sample_notes);

    // Test dynamic JVM heap calculation
    let heap_lite = ReaService::calculate_jvm_heap_mb(2048, false);
    assert_eq!(heap_lite, 1024); // 50% of 2048
    let heap_full = ReaService::calculate_jvm_heap_mb(16384, true);
    assert!(heap_full >= 4096);

    let _ = fs::remove_dir_all(&temp_dir);
}
