import { IconType } from "react-icons";

interface AuthSocialButtonProps {
  icon: IconType;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

const AuthSocialButton: React.FC<AuthSocialButtonProps> = ({
  icon: Icon,
  onClick,
  disabled,
  label,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="auth-social-btn"
    >
      <span className="auth-social-btn__icon">
        <Icon />
      </span>
      {label && <span className="auth-social-btn__label">{label}</span>}
      {/* Panda paw print watermark on hover */}
      <span className="auth-social-btn__paw" aria-hidden="true">🐾</span>
    </button>
  );
};

export default AuthSocialButton;
