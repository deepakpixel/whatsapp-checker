import { checkBatchUrls, checkWhatsApp } from "./lib/checker.js";

async function runTests() {
  console.log("=== Testing WhatsApp Checker Micro-Service ===\n");

  const testUrls = [
    "https://chat.whatsapp.com/JHdKYcFChmA81NlsFpz89P", // Expected: VALID
    "https://chat.whatsapp.com/HEwjm2ykp5k2D8Mc4TBFor", // Expected: VALID
    "https://chat.whatsapp.com/BwzqpuQALQCLsOTQwbJQpO", // Expected: INVALID (no group name)
    "https://chat.whatsapp.com/notareallink12345",       // Expected: INVALID
  ];

  console.log("1. Running batch check on test URLs...");
  const start = Date.now();
  const batchRes = await checkBatchUrls(testUrls);
  const duration = Date.now() - start;

  console.log(`Completed in ${duration}ms:`);
  console.log("Summary:", batchRes.summary);
  console.log("\nResults:");
  batchRes.results.forEach((r, i) => {
    console.log(`[${r.status}] ${r.url}`);
    if (r.groupName) console.log(`   Group Name: "${r.groupName}"`);
    if (r.details) console.log(`   Details: ${r.details}`);
  });

  console.log("\n=== Test Finished ===");
}

runTests().catch(console.error);
