<script lang="ts">
  import { Heading, Card } from "@lib/cubicdbKit";
  import SolvePlayground from "./SolvePlayground.svelte";
  import ReconstructionPlayground from "./ReconstructionPlayground.svelte";
  import SessionPlayground from "./SessionPlayground.svelte";

  let activePlayground: string = "overview";
</script>

<div class="min-h-screen bg-base-100">
  <div class="navbar bg-base-200 shadow-lg">
    <div class="flex-1">
      CubicDB Playground
    </div>
    <div class="flex-none gap-2">
      <p class="text-sm opacity-75">Testing Ground for Timer Features</p>
    </div>
  </div>

  <div class="p-6">
    <div class="tabs tabs-bordered mb-6">
      <button 
        class="tab {activePlayground === "overview" ? "tab-active" : ""}" 
        onclick={() => activePlayground = "overview"}
      >
        Overview
      </button>
      <button 
        class="tab {activePlayground === "solves" ? "tab-active" : ""}" 
        onclick={() => activePlayground = "solves"}
      >
        Solves
      </button>
      <button 
        class="tab {activePlayground === "reconstructions" ? "tab-active" : ""}" 
        onclick={() => activePlayground = "reconstructions"}
      >
        Reconstructions
      </button>
      <button 
        class="tab {activePlayground === "sessions" ? "tab-active" : ""}" 
        onclick={() => activePlayground = "sessions"}
      >
        Sessions
      </button>
      <button 
        class="tab {activePlayground === "docs" ? "tab-active" : ""}" 
        onclick={() => activePlayground = "docs"}
      >
        Use Cases Documentation
      </button>
    </div>

    {#if activePlayground === "overview"}
      <Card>
        <div class="space-y-6">
          <Heading tag="h2">Timer Feature Playground</Heading>

          <p class="text-lg leading-relaxed">
            Welcome to the Timer Playground! This is a controlled environment where you can test and verify
            all the major features and use cases of the timer without affecting real data.
          </p>

          <div class="divider">Available Test Areas</div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Solves Playground -->
            <div class="card bg-primary text-primary-content">
              <div class="card-body">
                <h3 class="card-title text-lg">Solve Management</h3>
                <div class="text-sm opacity-90">
                  Test all solve-related operations:
                  <ul class="list-disc pl-5 mt-2">
                    <li>Add, edit, delete solves</li>
                    <li>Apply penalties (DNF, +2)</li>
                    <li>Filter and sort solves</li>
                    <li>Calculate statistics</li>
                    <li>Search and export</li>
                  </ul>
                </div>
                <div class="card-actions justify-end mt-4">
                  <button
                    class="btn btn-sm btn-outline btn-primary-content"
                    onclick={() => {
                      activePlayground = "solves";
                    }}
                  >
                    Open Playground
                  </button>
                </div>
              </div>
            </div>

            <!-- Reconstructions Playground -->
            <div class="card bg-success text-success-content">
              <div class="card-body">
                <h3 class="card-title text-lg">Reconstructions</h3>
                <div class="text-sm opacity-90">
                  Test reconstruction parsing and analysis:
                  <ul class="list-disc pl-5 mt-2">
                    <li>Parse move sequences</li>
                    <li>Calculate HTM/STM metrics</li>
                    <li>Navigate step-by-step</li>
                    <li>Compare reconstructions</li>
                    <li>Validate move syntax</li>
                  </ul>
                </div>
                <div class="card-actions justify-end mt-4">
                  <button
                    class="btn btn-sm btn-outline btn-success-content"
                    onclick={() => {
                      activePlayground = "reconstructions";
                    }}
                  >
                    Open Playground
                  </button>
                </div>
              </div>
            </div>

            <!-- Sessions Playground -->
            <div class="card bg-info text-info-content">
              <div class="card-body">
                <h3 class="card-title text-lg">Session Management</h3>
                <div class="text-sm opacity-90">
                  Test session management features:
                  <ul class="list-disc pl-5 mt-2">
                    <li>Create/rename sessions</li>
                    <li>Configure settings</li>
                    <li>Duplicate sessions</li>
                    <li>View statistics</li>
                    <li>Export configuration</li>
                  </ul>
                </div>
                <div class="card-actions justify-end mt-4">
                  <button
                    class="btn btn-sm btn-outline btn-info-content"
                    onclick={() => {
                      activePlayground = "sessions";
                    }}
                  >
                    Open Playground
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="divider">How to Use</div>

          <div class="alert alert-info">
            <div class="flex-1">
              <h4 class="font-bold">Testing Workflow</h4>
              <p class="text-sm">
                1. Open a playground tab<br />
                2. Follow the step-by-step tabs within each playground<br />
                3. Interact with controls to trigger different events<br />
                4. Check the results in real-time<br />
                5. Verify that everything works as expected
              </p>
            </div>
          </div>

          <div class="alert alert-success">
            <div class="flex-1">
              <h4 class="font-bold">Benefits</h4>
              <p class="text-sm">
                ✓ Test features in isolation without affecting real data<br />
                ✓ Verify event-driven behavior with controlled inputs<br />
                ✓ Document expected behavior and edge cases<br />
                ✓ Quick feedback loop for feature validation<br />
                ✓ Safe playground for experimentation
              </p>
            </div>
          </div>
        </div>
      </Card>
    {:else if activePlayground === "solves"}
      <SolvePlayground />
    {:else if activePlayground === "reconstructions"}
      <ReconstructionPlayground />
    {:else if activePlayground === "sessions"}
      <SessionPlayground />
    {:else if activePlayground === "docs"}
      <Card>
        <div class="space-y-6">
          <Heading tag="h3">Complete Use Cases List</Heading>

          <div class="space-y-4">
            <div class="card bg-base-200">
              <div class="card-body">
                <h4 class="card-title">Solves (10 Use Cases)</h4>
                <ol class="list-decimal pl-6 space-y-1 text-sm">
                  <li>Add a solve with time and metadata</li>
                  <li>Delete a solve or batch delete selected</li>
                  <li>Edit solve details (time, penalty, comments)</li>
                  <li>Select/deselect individual or all solves</li>
                  <li>Apply penalties (DNF, +2) to solves</li>
                  <li>Filter solves by penalty status</li>
                  <li>Sort solves (by time, date, penalty)</li>
                  <li>Calculate statistics (best, worst, mean, Ao5)</li>
                  <li>Search solves by comments or metadata</li>
                  <li>Export solves to JSON format</li>
                </ol>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body">
                <h4 class="card-title">Reconstructions (8 Use Cases)</h4>
                <ol class="list-decimal pl-6 space-y-1 text-sm">
                  <li>Parse reconstruction from string input</li>
                  <li>Validate move sequence syntax</li>
                  <li>Replay moves step-by-step (forward/backward)</li>
                  <li>Jump to specific move in sequence</li>
                  <li>Get cube state at any point</li>
                  <li>Calculate HTM and STM metrics</li>
                  <li>Compare two reconstructions (similarity)</li>
                  <li>Export reconstruction with full analysis</li>
                </ol>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body">
                <h4 class="card-title">Sessions (10 Use Cases)</h4>
                <ol class="list-decimal pl-6 space-y-1 text-sm">
                  <li>Create a new session</li>
                  <li>Rename existing session</li>
                  <li>Delete a session</li>
                  <li>Switch between active sessions</li>
                  <li>Configure session settings (inspection, display)</li>
                  <li>View per-session statistics</li>
                  <li>Merge two sessions</li>
                  <li>Duplicate session configuration</li>
                  <li>Import/export session configuration</li>
                  <li>Track session activity history</li>
                </ol>
              </div>
            </div>
          </div>

          <div class="divider">Implementation Notes</div>

          <div class="alert">
            <p class="text-sm">
              <strong>Event-Driven Design:</strong> All playgrounds use Svelte stores to simulate
              the event-driven architecture of the main timer. When you trigger an action, the store
              updates are automatically reflected in all dependent components.
            </p>
          </div>

          <div class="alert">
            <p class="text-sm">
              <strong>Derived State:</strong> Statistics and filtered lists are computed as derived
              stores, ensuring they automatically update whenever the source data changes.
            </p>
          </div>

          <div class="alert">
            <p class="text-sm">
              <strong>Type Safety:</strong> All playground components are fully typed with TypeScript
              interfaces matching the main application's data structures.
            </p>
          </div>
        </div>
      </Card>
    {/if}
  </div>
</div>