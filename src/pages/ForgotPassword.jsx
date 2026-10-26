import React from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  return (
    <AuthLayout
      icon={Mail}
      title="Esqueceu a senha?"
      subtitle="Redefinição por e-mail ainda não está ativa"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Voltar para o login
        </Link>
      }
    >
      <p className="text-sm text-foreground text-center leading-relaxed">
        Nesta versão própria ainda não há envio de e-mail, então nenhum link de
        redefinição será enviado. Se você esqueceu a senha, crie uma nova conta
        com outro e-mail. Os protocolos e propagandas públicos continuam
        visíveis sem login.
      </p>
      <p className="text-sm text-muted-foreground text-center mt-4">
        Já tem conta?{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Entrar
        </Link>
        {" "}ou{" "}
        <Link to="/register" className="text-primary font-medium hover:underline">
          criar uma nova
        </Link>
        .
      </p>
    </AuthLayout>
  );
}
