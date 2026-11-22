import { describe, expect, it } from "vitest";
import { EMAIL_RATE_LIMIT_MESSAGE, signUpErrorMessage } from "./auth-helpers";

describe("signUpErrorMessage", () => {
  it("explains the e-mail limit on HTTP 429", () => {
    expect(signUpErrorMessage({ message: "Too many requests", status: 429 })).toBe(
      EMAIL_RATE_LIMIT_MESSAGE,
    );
  });
  it("explains the e-mail limit on over_email_send_rate_limit", () => {
    expect(
      signUpErrorMessage({ message: "x", status: 400, code: "over_email_send_rate_limit" }),
    ).toBe(EMAIL_RATE_LIMIT_MESSAGE);
  });
  it("explains the e-mail limit on 'email rate limit exceeded'", () => {
    expect(signUpErrorMessage({ message: "email rate limit exceeded" })).toBe(
      EMAIL_RATE_LIMIT_MESSAGE,
    );
  });
  it("shows Supabase's exact message for any other error", () => {
    expect(signUpErrorMessage({ message: "User already registered", status: 422 })).toBe(
      "Não foi possível criar a conta: User already registered",
    );
  });
});
