/**
 * A persistent notice shown on every screen: generated documents are drafts and
 * are not legal advice. Rendered in the root layout so it can't be missed.
 */
export default function DisclaimerBanner() {
  return (
    <div className="border-t border-accent-yellow/40 bg-accent-yellow/10 px-6 py-2 text-center text-xs text-navy dark:text-amber-100">
      <span className="font-medium">Draft only:</span> Documents generated here are drafts and must
      be reviewed by a qualified lawyer before use. Prelegal does not provide legal advice.
    </div>
  );
}
