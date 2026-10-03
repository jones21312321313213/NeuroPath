/**
 * Evaluates password criteria matching Django's core authentication requirements:
 * 1. Minimum 8 characters
 * 2. At least one uppercase letter (A-Z)
 * 3. At least one lowercase letter (a-z)
 * 4. At least one numeric digit (0-9)
 * 5. At least one special character
 */
export function evaluatePasswordRules(password = "") {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const rules = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial];
  const passedCount = rules.filter(Boolean).length;

  let strengthLabel = "Weak";
  let colorClass = "bg-rose-500";
  let percent = 0;

  if (passedCount >= 5 && hasLength) {
    strengthLabel = "Strong";
    colorClass = "bg-emerald-500";
    percent = 100;
  } else if (passedCount >= 3 && hasLength) {
    strengthLabel = "Medium";
    colorClass = "bg-amber-500";
    percent = 65;
  } else if (password.length > 0) {
    strengthLabel = "Weak";
    colorClass = "bg-rose-500";
    percent = 30;
  }

  return {
    hasLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    passedCount,
    strengthLabel,
    colorClass,
    percent,
    isValid: hasLength && hasUpper && hasLower && hasNumber && hasSpecial,
  };
}
