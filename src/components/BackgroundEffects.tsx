import React from 'react';

/** Fundo do Cigano: a mesa cigana sob a lua cheia. */
export const BackgroundEffects: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-black select-none pointer-events-none">
      <picture>
        <source media="(max-width: 767px)" srcSet="/image/fundo-cigano-celular.webp" />
        <img src="/image/fundo-cigano.webp" alt="" className="w-full h-full object-cover opacity-60" style={{ width: '100vw', height: '100vh' }} />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
    </div>
  );
};
