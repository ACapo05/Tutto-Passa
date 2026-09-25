import { buttonClass } from "@/components/ui";
import { logIn } from "@/app/actions";

export const metadata = { title: "Sign in · Tutto Passa" };

/** The one screen a stranger sees when APP_PASSWORD is set. */
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; wrong?: string }> }) {
  const { next = "/", wrong } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5">
      <span className="text-lg font-extrabold tracking-tight text-basil-ink">tutto passa</span>
      <h1 className="mt-6 text-2xl font-extrabold leading-tight">This copy is private</h1>
      <p className="mt-2 text-muted">
        Enter its password. To use Tutto Passa yourself, run your own copy: the README says how.
      </p>
      <form action={logIn} className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            aria-invalid={wrong ? true : undefined}
            aria-describedby={wrong ? "wrong" : undefined}
            className="rounded-2xl border border-line bg-card px-4 py-3 text-lg"
          />
        </label>
        {wrong && (
          <p id="wrong" role="alert" className="text-sm font-semibold text-tomato-ink">
            That is not the password.
          </p>
        )}
        <button type="submit" className={`${buttonClass("primary")} mt-2`}>
          Sign in
        </button>
      </form>
    </main>
  );
}
