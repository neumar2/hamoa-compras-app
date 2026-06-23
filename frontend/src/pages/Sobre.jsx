import React from 'react';

const Sobre = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-main)' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--primary-color)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
          ℹ️ Sobre o Sistema
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
          Hamoa Compras - Plataforma de Gestão de Aquisições e Suprimentos
        </p>
      </div>

      <div style={{ background: 'var(--container-bg)', padding: '2.5rem', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
        
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            🏢 O Projeto
          </h2>
          <p style={{ lineHeight: '1.6', fontSize: '1.05rem' }}>
            O <strong>Hamoa Compras</strong> foi projetado para centralizar, auditar e agilizar todo o processo de compras, orçamentos, equalizações e fluxo financeiro do condomínio.
            Nosso objetivo é proporcionar total transparência, rastreabilidade e eficiência na gestão de recursos, garantindo que cada centavo seja administrado com rigor e clareza.
          </p>
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            💻 Créditos de Desenvolvimento
          </h2>
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.05)', 
            border: '1px solid rgba(59, 130, 246, 0.2)', 
            padding: '1.5rem', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Este sistema foi inteiramente projetado e desenvolvido por:
            </p>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--accent-blue)', margin: '0', fontWeight: 'bold' }}>
              Neumar Porto Permonian
            </h3>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              Arquitetura de Software & Desenvolvimento Full-Stack
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <p>
            Versão 2.0.0 <br />
            Feito com ❤️ para otimizar a gestão.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Sobre;
