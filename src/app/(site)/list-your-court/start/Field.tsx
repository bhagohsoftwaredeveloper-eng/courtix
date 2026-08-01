/** A labelled input with its validation message.
 *
 *  Used by all three wizard steps, so it is its own module: importing it from a
 *  sibling step would make that step's file a dependency of the others for no
 *  reason. */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="field-label">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-[11.5px] font-semibold text-[#ff9370]">
          {error}
        </span>
      )}
    </label>
  );
}
