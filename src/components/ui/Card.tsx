import React from 'react';
import { BaseComponentProps } from '../../types';

interface CardProps extends BaseComponentProps {
  title?: string | React.ReactNode;
  description?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  description,
  className = '',
}) => {
  return (
    <div className={`card ${className}`}>
      {(title || description) && (
        <div className="p-6 pb-4">
          {title && (
            <h3 className="text-lg font-semibold leading-none tracking-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
      )}
      <div className={title || description ? 'px-6 pb-6' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};

export default Card;
