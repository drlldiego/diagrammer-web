import React, { ReactNode } from 'react';
import logoIsec from '../../../assets/logo-isec.png';
import './HomeHeader.css';

interface HomeHeaderProps {
  title: string | ReactNode;
  subtitle?: string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="home-header-container">
      <img src={logoIsec} alt="ISEC Logo" className="home-header-logo" />
      
      <div className="home-header-content">
        <h1 className="home-header-title">
          {title}
        </h1>
        {subtitle && (
          <p className="home-header-subtitle">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default HomeHeader;