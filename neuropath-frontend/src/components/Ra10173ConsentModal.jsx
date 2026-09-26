import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  LockIcon,
  PrinterIcon,
  CheckIcon,
  InformationCircleIcon,
} from "./ui/icons";

/**
 * Ra10173ConsentModal (Issue #188)
 *
 * Provides comprehensive legal disclosures required by the Philippine Data Privacy Act of 2012
 * (Republic Act 10173) and DepEd Special Education guidelines for processing sensitive personal
 * information and automated AI analysis for minor learners.
 */
export function Ra10173ConsentModal({ isOpen, onClose, onConfirm }) {
  const handlePrint = () => {
    window.print();
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    if (onClose) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Republic Act 10173 (Data Privacy Act of 2012) — Parental Consent & Disclosure Agreement"
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-slate-700"
          >
            <PrinterIcon className="w-4 h-4" aria-hidden="true" />
            Print / Export Copy
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
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
  );
}
