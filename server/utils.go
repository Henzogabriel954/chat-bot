package main

import (
	"regexp"
	"strings"
	"time"
)

var digitsRegex = regexp.MustCompile(`\D`)
var brMobileRegex = regexp.MustCompile(`^55\d{2}9\d{8}$`)
var brLandlineRegex = regexp.MustCompile(`^55\d{2}[2-8]\d{7}$`)

// Extrai apenas os números de um JID ou telefone
func extractDigits(jid string) string {
	parts := strings.Split(jid, "@")
	if len(parts) > 0 {
		return digitsRegex.ReplaceAllString(parts[0], "")
	}
	return digitsRegex.ReplaceAllString(jid, "")
}

// Gera as variações do número com e sem nono dígito (padrão Brasil)
func brVariants(n string) []string {
	num := digitsRegex.ReplaceAllString(n, "")
	if num == "" {
		return []string{}
	}
	if len(num) <= 11 {
		num = "55" + num
	}
	v := []string{num}
	if brMobileRegex.MatchString(num) {
		// remove o nono dígito
		v = append(v, num[0:4]+num[5:])
	} else if brLandlineRegex.MatchString(num) {
		// adiciona o nono dígito
		v = append(v, num[0:4]+"9"+num[4:])
	}
	return v
}

// Extrai o texto de uma mensagem do WhatsApp
func getMessageText(r MessageRecord) string {
	if r.Message == nil {
		return ""
	}
	if r.Message.Conversation != "" {
		return strings.TrimSpace(r.Message.Conversation)
	}
	if r.Message.ExtendedTextMessage != nil && r.Message.ExtendedTextMessage.Text != "" {
		return strings.TrimSpace(r.Message.ExtendedTextMessage.Text)
	}
	return ""
}

// Retorna hora formatada HH:MM:SS
func timeStr() string {
	return time.Now().Format("15:04:05")
}
