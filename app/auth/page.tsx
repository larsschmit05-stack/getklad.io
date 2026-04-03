import AuthForm from "./auth-form";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const { error, tab } = await searchParams;
  const callbackError =
    error === "auth_failed"
      ? "The sign-in link was invalid or has expired. Please try again."
      : null;

  return (
    <AuthForm
      initialTab={tab === "signup" ? "signup" : "login"}
      callbackError={callbackError}
    />
  );
}
