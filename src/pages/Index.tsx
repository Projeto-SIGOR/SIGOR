import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Ambulance, Flame, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sigor-blue via-sigor-blue/90 to-sigor-blue/80">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SIGOR</h1>
              <p className="text-white/60 text-sm">Sistema de Gestão de Ocorrências</p>
            </div>
          </div>
          <Link to="/auth">
            <Button variant="secondary" className="bg-white text-sigor-blue hover:bg-white/90">
              Entrar no Sistema
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </header>

        {/* Hero Section */}
        <main className="max-w-4xl mx-auto text-center py-16">
          <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
            Gestão Integrada de<br />
            <span className="text-sigor-yellow">Ocorrências em Tempo Real</span>
          </h2>
          <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
            Plataforma unificada para coordenação de respostas a emergências, 
            conectando polícia, SAMU e bombeiros em uma única central de operações.
          </p>

          {/* Services */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-left border border-white/10">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Polícia Militar</h3>
              <p className="text-white/60 text-sm">
                Despacho rápido de viaturas para ocorrências policiais com rastreamento em tempo real.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-left border border-white/10">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-4">
                <Ambulance className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">SAMU</h3>
              <p className="text-white/60 text-sm">
                Atendimento médico de urgência com coordenação eficiente de ambulâncias e equipes.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-left border border-white/10">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                <Flame className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Corpo de Bombeiros</h3>
              <p className="text-white/60 text-sm">
                Resposta ágil a incêndios e resgates com gestão integrada de recursos.
              </p>
            </div>
          </div>

          <Link to="/auth">
            <Button size="lg" className="bg-sigor-yellow text-sigor-blue hover:bg-sigor-yellow/90 font-semibold px-8">
              Acessar o Sistema
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </main>

        {/* Footer */}
        <footer className="text-center text-white/40 text-sm mt-16">
          <p>© 2024 SIGOR - Sistema Integrado de Gestão de Ocorrências em Tempo Real</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
