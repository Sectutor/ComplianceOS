import { sanitizeHtml, sanitizeObject } from "../../packages/core/src/lib/sanitization";

async function runTest() {
  console.log("=== Input Sanitization & XSS Prevention Integration Test ===");

  const dangerousScript = "<script>alert('xss')</script>";
  const sanitizedScript = sanitizeHtml(dangerousScript);
  console.log("Sanitized Script Output:", sanitizedScript);
  if (sanitizedScript.includes("<script>")) {
    throw new Error("FAILED: Script tags were not escaped properly!");
  }

  const dangerousPayload = {
    title: "<img src=x onerror=alert(1)>",
    details: {
      comment: "Hello <a href='javascript:evil()'>Click me</a>",
    },
  };

  const sanitizedPayload = sanitizeObject(dangerousPayload);
  console.log("Sanitized Payload:", JSON.stringify(sanitizedPayload, null, 2));

  if (sanitizedPayload.title.includes("<img") || sanitizedPayload.details.comment.includes("<a")) {
    throw new Error("FAILED: Object properties were not sanitized recursively!");
  }

  console.log("=== Input Sanitization & XSS Prevention Test PASSED Successfully ===");
}

runTest();
