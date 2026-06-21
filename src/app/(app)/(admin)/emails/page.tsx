import { requireAdmin } from "@/lib/session";
import { getEffectiveTemplates } from "@/lib/email-templates";
import EmailTemplateForm from "./EmailTemplateForm";

/**
 * Admin "Emails" tab — every transactional email the app sends, with its
 * subject and body editable in one place. Edits are stored as overrides; the
 * built-in defaults stay as a fallback and can be restored per template.
 */
export default async function EmailsPage() {
  await requireAdmin();
  const templates = await getEffectiveTemplates();

  return (
    <div>
      <h1>Emails</h1>
      <p className="lede">
        Review and edit the wording of every automated email. Changes take effect
        immediately on the next email sent. Use the listed variables to insert live
        values.
      </p>

      {templates.map(({ key, ...rest }) => (
        <EmailTemplateForm key={key} templateKey={key} {...rest} />
      ))}
    </div>
  );
}
