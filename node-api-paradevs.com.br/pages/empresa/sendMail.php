<?php

// Incluindo a biblioteca de envio de email
require 'PHPMailerAutoload.php';

// Criação da classe de API de envio de email
class EmailAPI {
    
    // Dados do servidor de email
    private $smtp_server;
    private $smtp_username;
    private $smtp_password;
    private $smtp_port;

    // Construtor da classe
    public function __construct($smtp_server, $smtp_username, $smtp_password, $smtp_port) {
        $this->smtp_server = $smtp_server;
        $this->smtp_username = $smtp_username;
        $this->smtp_password = $smtp_password;
        $this->smtp_port = $smtp_port;
    }

    // Função de envio de email
    public function sendEmail($from_email, $from_name, $to_email, $to_name, $subject, $message) {
        // Cria um novo objeto de mensagem
        $mail = new PHPMailer();

        // Define os dados do servidor de email
        $mail->IsSMTP();
        $mail->SMTPAuth = true;
        $mail->SMTPSecure = "tls";
        $mail->Host = $this->smtp_server;
        $mail->Username = $this->smtp_username;
        $mail->Password = $this->smtp_password;
        $mail->Port = $this->

            // Define os dados do remetente
            $mail->From = $from_email;
            $mail->FromName = $from_name;
    
            // Define os dados do destinatário
            $mail->AddAddress($to_email, $to_name);
    
            // Define os dados da mensagem
            $mail->Subject = $subject;
            $mail->Body = $message;
    
            // Envia a mensagem
            if (!$mail->Send()) {
                return "Ocorreu um erro ao enviar o email: " . $mail->ErrorInfo;
            } else {
                return "Email enviado com sucesso!";
            }
        }
    }
    
    // Cria uma nova instância da classe EmailAPI
    $emailAPI = new EmailAPI("smtp.example.com", "seu_email@example.com", "sua_senha", 587);
    
    // Dados do remetente e destinatário
    $from_email = "seu_email@example.com";
    $from_name = "Seu Nome";
    $to_email = "destinatario@example.com";
    $to_name = "Destinatário";
    
    // Assunto e corpo da mensagem
    $subject = "Assunto do email";
    $message = "Corpo da mensagem";
    
  // Envia o email
$status = $emailAPI->sendEmail($from_email, $from_name, $to_email, $to_name, $subject, $message);

// Exibe o status do envio
echo $status;