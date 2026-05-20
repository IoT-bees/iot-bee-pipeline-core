import { ErrorView } from "@/components/error/ErrorView";

export default function NotFound() {
  return (
    <ErrorView
      code="404"
      eyebrow="not found"
      title="This route never reached the hive."
      body="The page may have moved, the pipeline id may be wrong, or the link points to a resource that no longer exists."
      actions={[{ href: "/", label: "back to home", primary: true }]}
    />
  );
}
