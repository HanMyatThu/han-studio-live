/** Runs once when the server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { recoverJobs } = await import("./instrumentation-node");
    await recoverJobs();
  }
}
