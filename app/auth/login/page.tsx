import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const callbackError =
    error === "auth_failed"
      ? "The sign-in link was invalid or has expired. Please try again."
      : null;

  return <LoginForm callbackError={callbackError} />;
}
