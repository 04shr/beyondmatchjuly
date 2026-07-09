/* ========================================================================
   SKELETON LOADER UTILITIES
   Use these functions in your api.js and candidate.js
   ======================================================================== */

// Job Card Skeleton
function createJobSkeleton() {
  return `
    <div class="skeleton-job-card">
      <div class="skeleton-title" style="width: 70%;"></div>
      <div class="skeleton-subtitle" style="width: 45%; margin: 12px 0 8px 0;"></div>
      <div class="skeleton-text" style="width: 60%;"></div>
      <div class="skeleton-text" style="width: 55%;"></div>
      <div class="skeleton-button"></div>
    </div>
  `;
}

// Candidate Match Card Skeleton — shaped like the real match-card
function createCandidateSkeleton() {
  return `
    <div class="skeleton-candidate-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:10px;">
        <div style="flex:1;">
          <div class="skeleton-title" style="width:65%;height:16px;margin-bottom:8px;"></div>
          <div class="skeleton-subtitle" style="width:42%;height:12px;"></div>
        </div>
        <div class="skeleton-ring"></div>
      </div>
      <div class="skeleton-chip"></div>
      <div class="skeleton-subtitle" style="width:38%;height:13px;margin:10px 0;"></div>
      <div class="skeleton-insight"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px;">
        <div class="skeleton-btn"></div>
        <div class="skeleton-btn"></div>
        <div class="skeleton-btn"></div>
      </div>
    </div>
  `;
}

// Create multiple skeletons
function createSkeletonLoader(count = 5, type = 'job') {
  const createFn = type === 'candidate' ? createCandidateSkeleton : createJobSkeleton;
  return Array(count).fill(null).map(() => createFn()).join('');
}

// Show job skeleton loader in grid
function showJobsSkeletonLoader(container, count = 5) {
  if (!container) return;
  container.innerHTML = createSkeletonLoader(count, 'job');
}

// Show candidate skeleton loader in grid
function showCandidatesSkeletonLoader(container, count = 3) {
  if (!container) return;
  container.innerHTML = createSkeletonLoader(count, 'candidate');
}

// Example usage in your code:
// Before: grid.innerHTML = "Loading jobs...";
// After: showJobsSkeletonLoader(grid, 5);

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createJobSkeleton,
    createCandidateSkeleton,
    createSkeletonLoader,
    showJobsSkeletonLoader,
    showCandidatesSkeletonLoader
  };
}