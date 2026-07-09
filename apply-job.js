/**
 * apply-job.js — BeyondMatch
 * ─────────────────────────────────────────────────────────────
 * Handles what happens when a candidate clicks "Apply" on a job.
 *
 * USAGE (add to cand-matches.html and candidate-dashboard.html):
 *   <script type="module" src="apply-job.js"></script>
 *
 * Exposes: window.applyToJob(jobId, jobTitle, recruiterId)
 * ─────────────────────────────────────────────────────────────
 * Firestore structure created:
 *
 * applications/{auto_id} {
 *   job_id, job_title,
 *   candidate_id, candidate_name, candidate_email,
 *   recruiter_id,
 *   status: "applied",
 *   note: "",
 *   rec_unread: true,   // recruiter sees this as new
 *   cand_unread: false,
 *   status_history: [],
 *   applied_at: serverTimestamp(),
 *   updated_at: serverTimestamp()
 * }
 *
 * notifications/{auto_id} {
 *   to_user_id: recruiterId,
 *   to_role: "recruiter",
 *   from_role: "candidate",
 *   type: "new_application",
 *   app_id, job_title, candidate_name,
 *   message: "...",
 *   read: false,
 *   created_at: serverTimestamp()
 * }
 * ─────────────────────────────────────────────────────────────
 */

import { auth, db } from "./auth.js";
import {
  collection, addDoc, query, where, getDocs, doc, getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ─────────────────────────────────────────────────
   applyToJob
   Call this when a candidate clicks the Apply button.

   @param {string} jobId         — the job's Firestore doc id (or job_id field)
   @param {string} jobTitle      — display title of the job
   @param {string} recruiterId   — uid of the recruiter who posted the job
   @param {string} [jobFirestoreId] — Firestore doc id if different from jobId
   ───────────────────────────────────────────────── */
window.applyToJob = async function (jobId, jobTitle, recruiterId, jobFirestoreId) {
  const user = auth.currentUser;
  if (!user) {
    if (window.showToast) showToast("Please log in to apply.", "warning");
    return false;
  }

  // get candidate profile
  const userSnap = await getDoc(doc(db, "users", user.uid)).catch(() => null);
  if (!userSnap?.exists()) {
    if (window.showToast) showToast("Candidate profile not found.", "error");
    return false;
  }
  const userData = userSnap.data();
  const candidateId = userData.candidate_id || userData.latest_candidate_id;
  if (!candidateId) {
    if (window.showToast) showToast("Please complete your profile first.", "warning");
    return false;
  }

  // fetch candidate details
  let candidateName  = user.email?.split("@")[0] || "Candidate";
  let candidateEmail = user.email || "";
  let candidateRole  = "";
  try {
    const cSnap = await getDoc(doc(db, "candidates", candidateId));
    if (cSnap.exists()) {
      const cd = cSnap.data();
      candidateName  = cd.name  || candidateName;
      candidateEmail = cd.email || candidateEmail;
      candidateRole  = cd.applied_role || "";
    }
  } catch { /* use fallbacks */ }

  // check for duplicate application
  try {
    const dupQ = query(
      collection(db, "applications"),
      where("job_id",       "==", jobId),
      where("candidate_id", "==", candidateId)
    );
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      if (window.showToast) showToast("You've already applied to this job.", "info", "Already Applied");
      return false;
    }
  } catch { /* proceed */ }

  // create application doc
  let appRef;
  try {
    appRef = await addDoc(collection(db, "applications"), {
      job_id:          jobId,
      job_firestore_id: jobFirestoreId || jobId,
      job_title:       jobTitle,
      candidate_id:    candidateId,
      candidate_name:  candidateName,
      candidate_email: candidateEmail,
      candidate_role:  candidateRole,
      recruiter_id:    recruiterId,
      status:          "applied",
      note:            "",
      rec_unread:      true,
      cand_unread:     false,
      status_history:  [],
      applied_at:      serverTimestamp(),
      updated_at:      serverTimestamp()
    });
  } catch (err) {
    if (window.showToast) showToast("Application failed. Please try again.", "error");
    console.error("applyToJob error:", err);
    return false;
  }

  // create recruiter notification
  if (recruiterId) {
    try {
      await addDoc(collection(db, "notifications"), {
        to_user_id:     recruiterId,
        to_role:        "recruiter",
        from_role:      "candidate",
        type:           "new_application",
        app_id:         appRef.id,
        job_id:         jobId,
        job_title:      jobTitle,
        candidate_name: candidateName,
        message:        `${candidateName} applied for "${jobTitle}".`,
        read:           false,
        created_at:     serverTimestamp()
      });
    } catch { /* non-critical */ }
  }

  if (window.showToast) showToast(`Applied to ${jobTitle}!`, "success", "Application Sent");
  return true;
};


/* ─────────────────────────────────────────────────
   hasApplied
   Check if current candidate already applied to a job.
   Returns true/false. Useful to disable Apply buttons.
   ───────────────────────────────────────────────── */
window.hasApplied = async function (jobId) {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const candidateId = userSnap.exists()
      ? (userSnap.data().candidate_id || userSnap.data().latest_candidate_id)
      : null;
    if (!candidateId) return false;

    const q = query(
      collection(db, "applications"),
      where("job_id",       "==", jobId),
      where("candidate_id", "==", candidateId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch { return false; }
};


/* ─────────────────────────────────────────────────
   markApplyButtons
   Call after rendering job cards to automatically
   update Apply button states based on existing apps.

   @param {Array} jobs — array of job objects with .job_id and .recruiter_id
   ───────────────────────────────────────────────── */
window.markApplyButtons = async function (jobs) {
  const user = auth.currentUser;
  if (!user || !jobs?.length) return;

  try {
    const userSnap   = await getDoc(doc(db, "users", user.uid));
    const candidateId = userSnap.exists()
      ? (userSnap.data().candidate_id || userSnap.data().latest_candidate_id)
      : null;
    if (!candidateId) return;

    const q = query(
      collection(db, "applications"),
      where("candidate_id", "==", candidateId)
    );
    const snap    = await getDocs(q);
    const applied = new Set(snap.docs.map(d => d.data().job_id));

    document.querySelectorAll("[data-apply-job]").forEach(btn => {
      const jobId = btn.getAttribute("data-apply-job");
      if (applied.has(jobId)) {
        btn.textContent    = "✓ Applied";
        btn.disabled       = true;
        btn.style.opacity  = "0.6";
        btn.style.cursor   = "default";
      }
    });
  } catch { /* best-effort */ }
};