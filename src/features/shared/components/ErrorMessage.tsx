export function ErrorMessage({
  message = "Something went wrong",
}: {
  message?: string;
}) {
  return (
    <div className="py-12 text-center">
      <div className="text-lg text-red-400">{message}</div>
    </div>
  );
}
