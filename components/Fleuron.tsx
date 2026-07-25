export default function Fleuron({ label }: { label?: string }) {
  return (
    <div className="fleuron" role="presentation">
      <span>{label ? `❖ ${label} ❖` : "❖"}</span>
    </div>
  );
}
