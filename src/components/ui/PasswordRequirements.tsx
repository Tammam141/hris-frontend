import { checkPasswordRules } from '../../utils/passwordValidation';

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const rules = checkPasswordRules(password || '');

  return (
    <div style={{ marginTop: '8px', marginBottom: '8px', fontSize: '12px' }}>
      <div style={{ color: '#64748b', fontWeight: 500, marginBottom: '6px' }}>Syarat password:</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px' }}>
        {rules.map((rule) => (
          <div
            key={rule.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: rule.met ? '#16a34a' : '#64748b',
              fontWeight: rule.met ? 500 : 400,
              transition: 'color 0.15s ease',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: rule.met ? '#dcfce7' : '#f1f5f9',
                color: rule.met ? '#16a34a' : '#94a3b8',
              }}
            >
              {rule.met ? '✓' : '✗'}
            </span>
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
