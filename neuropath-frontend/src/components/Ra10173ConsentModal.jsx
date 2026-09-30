import { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  LockIcon,
  DownloadIcon,
  CheckIcon,
  InformationCircleIcon,
  UserIcon,
} from "./ui/icons";
import { studentsAPI } from "../api/client";
import { useToast } from "../context/ToastContext";

/**
 * Ra10173ConsentModal (Issue #188, Enhanced in Issue #213 / Bundle 2)
 *
 * Provides comprehensive legal disclosures required by the Philippine Data Privacy Act of 2012
 * (Republic Act 10173) and DepEd Special Education guidelines for processing sensitive personal
 * information and automated AI analysis for minor learners.
 *
 * Supports dynamic student/guardian metadata injection, downloadable PDF certificate, and read-only viewing.
 */
export function Ra10173ConsentModal({
  isOpen,
  onClose,
  onConfirm,
  student,
  learnerName,
  guardianName,
  guardianRelationship,
  school,
  schoolYear,
  consentDate,
  readOnly = false,
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const { toast } = useToast();

  const effectiveLearnerName =
    learnerName ||
    student?.learnerName ||
    student?.studentName ||
    student?.name ||
    "";
  const effectiveGuardianName =
    guardianName ||
    student?.guardianName ||
    student?.guardian_name ||
    "";
  const effectiveRelationship =
    guardianRelationship ||
    student?.guardianRelationship ||
    student?.guardian_relationship ||
    "Parent / Legal Guardian";
  const effectiveSchool =
    school ||
    student?.school ||
    "Department of Education — Special Education Division";
  const effectiveSchoolYear =
    schoolYear ||
    student?.schoolYear ||
    student?.school_year ||
    "";
  const effectiveConsentDate =
    consentDate ||
    student?.consentDate ||
    student?.consent_date ||
    "";
  const effectiveGrade =
    student?.grade ||
    student?.gradeLevel ||
    student?.grade_level ||
    "";

  const isConsentVerified = Boolean(
    student?.parental_consent_obtained || onConfirm
  );

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError("");

    try {
      const studentId = student?.studentID || student?.id || student?.pk;
      let blob;
      if (studentId) {
        blob = await studentsAPI.exportConsentPDF(studentId);
      } else {
        blob = await studentsAPI.exportConsentPDF({
          learnerName: effectiveLearnerName,
          guardianName: effectiveGuardianName,
          guardianRelationship: effectiveRelationship,
          school: effectiveSchool,
          schoolYear: effectiveSchoolYear,
          grade: effectiveGrade,
          consentDate: effectiveConsentDate,
        });
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanName = (effectiveLearnerName || "Learner").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "Learner";
      link.download = `RA10173_Parental_Consent_Certificate_${cleanName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      toast.success("RA 10173 Consent Certificate downloaded successfully.");
    } catch (err) {
      const msg = err.message || "Failed to download Consent Certificate PDF.";
      setDownloadError(msg);
      toast.error(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Republic Act 10173 (Data Privacy Act of 2012) — Parental Consent & Disclosure Agreement"
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-1.5 text-slate-700"
              >
                <DownloadIcon className="w-4 h-4" aria-hidden="true" />
                {isDownloading ? "Downloading PDF..." : "Download Consent PDF"}
              </Button>
              {downloadError && (
                <span className="text-xs text-red-600 font-medium" role="alert">
                  {downloadError}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={readOnly ? "primary" : "ghost"}
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
              {!readOnly && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConfirm}
                  className="flex items-center gap-1.5"
                >
                  <CheckIcon className="w-4 h-4" aria-hidden="true" />
                  I Have Read &amp; Understood the Terms
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-6 text-sm text-slate-700 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
          {/* Header Notice Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-950 text-xs">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-900 m-0">
                Mandatory Statutory Disclosure (Republic Act No. 10173)
              </p>
              <p className="m-0 text-blue-800/90 leading-normal">
                In strict accordance with the Data Privacy Act of 2012 (RA 10173) of the Republic of the Philippines and relevant Department of Education (DepEd) directives, the collection, recording, and processing of sensitive personal information concerning minor learners requires the informed, explicit, and freely given consent of the parent or legal guardian.
              </p>
            </div>
          </div>

          {/* Learner & Legal Guardian Identification Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                Learner &amp; Legal Guardian Record
              </span>
              <span
                className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded border text-[11px] ${
                  isConsentVerified
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-amber-700 bg-amber-50 border-amber-200"
                }`}
              >
                <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {isConsentVerified ? "Consent Document" : "Pending Verification"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              <div>
                <span className="text-slate-500 font-medium">Learner Name: </span>
                <strong className="text-slate-900 font-semibold">
                  {effectiveLearnerName || "—"}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Grade &amp; School Year: </span>
                <span className="text-slate-800">
                  {[effectiveGrade, effectiveSchoolYear].filter(Boolean).join(" • ") || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Parent / Guardian: </span>
                <strong className="text-slate-900 font-semibold">
                  {effectiveGuardianName || "—"}
                </strong>
                {effectiveRelationship && (
                  <span className="text-slate-500 ml-1">({effectiveRelationship})</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 font-medium">School / Center: </span>
                <span className="text-slate-800">{effectiveSchool || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Consent Date: </span>
                <span className="text-slate-800">{effectiveConsentDate || "—"}</span>
              </div>
            </div>
          </div>

          {/* Section 1 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-200 pb-1">
              <DocumentTextIcon className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <h4>1. Categories of Sensitive Personal Information Collected</h4>
            </div>
            <p className="text-xs text-slate-600">
              To formulate a tailored educational trajectory, NeuroPath records and structures the following data points:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-2">
              <li><strong>Demographic Information:</strong> Learner legal name, age, birthdate, gender, enrolled grade level, school, and school year.</li>
              <li><strong>Special Education &amp; Diagnostic Records:</strong> Clinical diagnostic category (e.g., Autism Spectrum Disorder), diagnosis specifics, assessment dates, and evaluation scores.</li>
              <li><strong>Present Levels of Academic Achievement &amp; Functional Performance (PLAAFP):</strong> Academic strengths, functional needs, curriculum impact notes, and parent/guardian educational concerns.</li>
              <li><strong>Learning Difficulties &amp; Accommodations:</strong> Physical, sensory, and behavioral barriers, along with recommended assistive technology and classroom modifications.</li>
              <li><strong>IEP Learning Goals &amp; Evaluation Milestones:</strong> Annual target benchmarks, measurable short-term objectives, and periodic skill mastery observations.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-200 pb-1">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <h4>2. Educational Purposes of Data Processing</h4>
            </div>
            <p className="text-xs text-slate-600">
              All gathered information is processed exclusively for the following authorized educational objectives:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-2">
              <li>Formulating and maintaining legally compliant, highly customized Individualized Education Plans (IEPs).</li>
              <li>Synthesizing adapted daily lesson plans and pedagogical teaching strategies aligned with DepEd inclusive education standards.</li>
              <li>Generating structured pictorial visual aids to foster classroom engagement and functional communication.</li>
              <li>Conducting longitudinal outcome monitoring to verify that targeted developmental milestones are achieved.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-200 pb-1">
              <LockIcon className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <h4>3. Automated AI Processing &amp; Safeguards</h4>
            </div>
            <p className="text-xs text-slate-600">
              NeuroPath incorporates artificial intelligence assistance with rigorous privacy guardrails:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-2">
              <li><strong>Assistive Drafting Only:</strong> Generative AI acts strictly as an assistive tool to draft instructional suggestions. Every generated IEP goal, lesson plan, and strategy requires explicit human review and authorization by the licensed special education teacher.</li>
              <li><strong>Zero Commercialization:</strong> Learner data is never monetized, rented, or distributed to advertising or commercial third parties.</li>
              <li><strong>No Public Model Training:</strong> Learner information, clinical notes, and assessment texts are strictly excluded from training public or commercial large language models (LLMs).</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-200 pb-1">
              <LockIcon className="w-4 h-4 text-slate-700" aria-hidden="true" />
              <h4>4. Data Retention, Storage &amp; Confidentiality</h4>
            </div>
            <p className="text-xs text-slate-600">
              Data security complies with statutory standards for educational records:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-2">
              <li><strong>Cryptographic Protection:</strong> Data in transit is protected via TLS 1.3 encryption, and data at rest is encrypted in compliant cloud database environments.</li>
              <li><strong>Role-Based Scoped Access:</strong> Access to learner records is strictly limited to the authenticated teacher of record and designated school administrative personnel.</li>
              <li><strong>Data Retention:</strong> Records are retained solely for the duration of the learner's active special education enrollment or as mandated by DepEd record retention schedules, after which they are securely sanitized.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-200 pb-1">
              <ShieldCheckIcon className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              <h4>5. Statutory Rights of the Parent / Legal Guardian</h4>
            </div>
            <p className="text-xs text-slate-600">
              Under Section 16 of Republic Act No. 10173, parents and legal guardians retain the absolute right to:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-2">
              <li><strong>Right to be Informed:</strong> Know whether personal data pertaining to their child is being processed.</li>
              <li><strong>Right to Access:</strong> Inspect and request physical or digital copies of their child's records.</li>
              <li><strong>Right to Rectification:</strong> Dispute and correct inaccurate, outdated, or incomplete learner details.</li>
              <li><strong>Right to Object &amp; Withdraw Consent:</strong> Revoke consent for automated AI processing at any time without compromising the student's entitlement to regular public or private educational accommodations.</li>
              <li><strong>Right to File a Complaint:</strong> Lodge formal inquiries or complaints with the National Privacy Commission (NPC) regarding any data handling concerns.</li>
            </ul>
          </section>

          {/* Confirmation Sign-off notice */}
          <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600 border border-slate-200">
            <p className="m-0 font-medium text-slate-800">
              By clicking "I Have Read &amp; Understood the Terms", you acknowledge that you have reviewed the complete statutory disclosure and that consent verification has been officially coordinated with the learner's parent or legal guardian.
            </p>
          </div>
        </div>
      </Modal>

      {/* Official DepEd Printable RA 10173 Consent Certificate (Rendered strictly in @media print) */}
      <div className="ra10173-print-certificate" aria-hidden="true">
        <div className="ra10173-print-header">
          <p style={{ margin: 0, fontSize: "10pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
            Republic of the Philippines
          </p>
          <p style={{ margin: "2px 0", fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase" }}>
            Department of Education
          </p>
          <p className="ra10173-print-subtitle">
            Bureau of Learning Delivery — Student Inclusion Division
          </p>
          <h2 className="ra10173-print-title">
            Parental Consent &amp; Statutory Data Privacy Disclosure Form
          </h2>
          <p className="ra10173-print-subtitle">
            In Strict Compliance with Republic Act No. 10173 (Data Privacy Act of 2012)
          </p>
        </div>

        {/* Learner Identification Table */}
        <table className="ra10173-print-table">
          <tbody>
            <tr>
              <th>Learner Full Name:</th>
              <td><strong>{effectiveLearnerName || "______________________________________"}</strong></td>
              <th>Grade &amp; School Year:</th>
              <td>{[effectiveGrade, effectiveSchoolYear].filter(Boolean).join(" / ") || "____________________"}</td>
            </tr>
            <tr>
              <th>School / Center:</th>
              <td>{effectiveSchool || "Department of Education Special Education Center"}</td>
              <th>Consent Verification Date:</th>
              <td>{effectiveConsentDate || new Date().toISOString().split("T")[0]}</td>
            </tr>
            <tr>
              <th>Parent / Legal Guardian:</th>
              <td><strong>{effectiveGuardianName || "______________________________________"}</strong></td>
              <th>Relationship to Learner:</th>
              <td>{effectiveRelationship}</td>
            </tr>
          </tbody>
        </table>

        {/* Print Disclosures */}
        <div className="ra10173-print-section">
          <h4>1. Scope of Sensitive Personal Information Collected</h4>
          <p>
            In formulating and administering the learner's Individualized Education Plan (IEP), NeuroPath processes learner demographics, clinical diagnostic categories (ASD), present levels of academic achievement and functional performance (PLAAFP), specialized accommodations, and longitudinal goal mastery data.
          </p>
        </div>

        <div className="ra10173-print-section">
          <h4>2. Educational Purpose &amp; Human-in-the-Loop AI Safeguards</h4>
          <p>
            All data is processed strictly for authorized special education planning. Generative AI serves solely as an assistive drafting tool subject to explicit authorization and review by licensed special education educators. Learner records are never commercialized, never shared with third-party advertisers, and strictly excluded from training public commercial models.
          </p>
        </div>

        <div className="ra10173-print-section">
          <h4>3. Data Security, Confidentiality &amp; Storage</h4>
          <p>
            Records are safeguarded using cryptographic protections in transit (TLS 1.3) and at rest. Access is restricted strictly to authorized teachers and designated school administrators, adhering to DepEd data retention schedules.
          </p>
        </div>

        <div className="ra10173-print-section">
          <h4>4. Statutory Rights of the Data Subject (RA 10173 Section 16)</h4>
          <p>
            Parents and legal guardians retain statutory rights to be informed, inspect records, rectify inaccuracies, object to or revoke AI processing without compromising standard educational accommodations, and file inquiries with the National Privacy Commission (NPC).
          </p>
        </div>

        {/* Formal Consent Declaration */}
        <div className="ra10173-print-declaration">
          <strong>LEGAL GUARDIAN ATTESTATION &amp; CONSENT:</strong>
          <p style={{ margin: "4px 0 0 0" }}>
            I hereby certify that I am the parent or legal guardian of the learner named above. I acknowledge that I have been fully informed of the purposes, automated safeguards, and statutory rights concerning the processing of my child's sensitive educational information under Republic Act No. 10173. I grant my informed consent for the formulation, implementation, and evaluation of the Individualized Education Plan (IEP).
          </p>
        </div>

        {/* Signature Blocks */}
        <div className="ra10173-print-signatures">
          <div className="ra10173-print-sig-col">
            <div className="ra10173-print-sig-line">
              {effectiveGuardianName || "Parent / Legal Guardian Signature"}
            </div>
            <p style={{ margin: "2px 0 0 0", textAlign: "center", fontSize: "8pt", color: "#475569" }}>
              Signature over Printed Name of Parent / Guardian ({effectiveRelationship})
            </p>
            <p style={{ margin: "2px 0 0 0", textAlign: "center", fontSize: "8pt", color: "#64748b" }}>
              Date Signed: {effectiveConsentDate || "________________________"}
            </p>
          </div>

          <div className="ra10173-print-sig-col">
            <div className="ra10173-print-sig-line">
              SPED Teacher / Evaluator Signature
            </div>
            <p style={{ margin: "2px 0 0 0", textAlign: "center", fontSize: "8pt", color: "#475569" }}>
              Signature over Printed Name of Case Manager / Evaluator
            </p>
            <p style={{ margin: "2px 0 0 0", textAlign: "center", fontSize: "8pt", color: "#64748b" }}>
              Verification Date: {effectiveConsentDate || new Date().toISOString().split("T")[0]}
            </p>
          </div>
        </div>

        <div className="ra10173-print-footer-notice">
          Official DepEd SPED IEP Form — Formulated under Republic Act No. 10173 (Data Privacy Act of 2012) &amp; NPC Guidelines.
        </div>
      </div>
    </>
  );
}
