import { GithubIcon } from '../icons/GithubIcon';
import { LinkedinIcon } from '../icons/LinkedinIcon';
import '../ui/layout.css';

interface AppFooterProps {
  className?: string;
  // 'blue' dipakai di halaman login agar menyatu dengan background biru
  variant?: 'default' | 'blue';
}

export function AppFooter({ className = '', variant = 'default' }: AppFooterProps) {
  const variantClass = variant === 'blue' ? 'app-footer--blue' : '';
  return (
    <footer className={`app-footer ${variantClass} ${className}`.replace(/\s+/g, ' ').trim()}>
      <div className="app-footer-accent-bar" />
      <div className="app-footer-content">
        <div className="app-footer-brand">
          <span className="app-footer-title">HRIS</span>
          <span className="app-footer-divider">—</span>
          <span className="app-footer-desc">Aplikasi Human Resource Information System</span>
        </div>
        <div className="app-footer-devs">
          <div className="app-footer-dev-card">
            <span className="app-footer-role">Backend Developer</span>
            <div className="app-footer-dev-info">
              <span className="app-footer-name">Ismail Muhammad</span>
              <a href="https://github.com/DeadBear34" target="_blank" rel="noopener noreferrer" title="GitHub" className="app-footer-social-link">
                <GithubIcon size={14} />
              </a>
              <a href="https://www.linkedin.com/in/ismail-muhammad-05b2a12b1/" target="_blank" rel="noopener noreferrer" title="LinkedIn" className="app-footer-social-link">
                <LinkedinIcon size={14} />
              </a>
            </div>
          </div>
          <div className="app-footer-dev-card">
            <span className="app-footer-role">Frontend Developer</span>
            <div className="app-footer-dev-info">
              <span className="app-footer-name">Muhammad Tammam Tanjung</span>
              <a href="https://github.com/Tammam141" target="_blank" rel="noopener noreferrer" title="GitHub" className="app-footer-social-link">
                <GithubIcon size={14} />
              </a>
              <a href="https://www.linkedin.com/in/muhammad-tammam-tanjung-7562952b1" target="_blank" rel="noopener noreferrer" title="LinkedIn" className="app-footer-social-link">
                <LinkedinIcon size={14} />
              </a>
            </div>
          </div>
          <div className="app-footer-dev-card">
            <span className="app-footer-role">Quality Assurance (QA)</span>
            <div className="app-footer-dev-info">
              <span className="app-footer-name">Zahrah Purnama Alam</span>
              <a href="https://github.com/zhrahprn" target="_blank" rel="noopener noreferrer" title="GitHub" className="app-footer-social-link">
                <GithubIcon size={14} />
              </a>
              <a href="https://www.linkedin.com/in/zahrah-purnama-alam-464b312b0" target="_blank" rel="noopener noreferrer" title="LinkedIn" className="app-footer-social-link">
                <LinkedinIcon size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
