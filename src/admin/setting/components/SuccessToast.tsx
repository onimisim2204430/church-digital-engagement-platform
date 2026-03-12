import React from 'react';
import Icon from '../../../components/common/Icon';

interface SuccessToastProps {
  message: string | null;
}

const SuccessToast: React.FC<SuccessToastProps> = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <div className="toast-success">
      <Icon name="check_circle" size={18} />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default React.memo(SuccessToast);
