"use client";

export default function LogsPage() {
  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Journaux / Logs</h1>

      <p className="text-blue-200 mb-4">
        Cette section affichera bientôt les logs du système (connexion, actions, erreurs…).
      </p>

      <div className="bg-blue-900 p-4 rounded-lg border border-white/10">
        <pre className="text-blue-300">
{`[2025-01-15 10:22] - Système initialisé
[2025-01-15 10:25] - Connexion utilisateur : admin@test.com
[2025-01-15 10:27] - Création d'un nouveau compte utilisateur
[2025-01-15 10:31] - Modification d'un ticket
[2025-01-15 10:33] - Déconnexion utilisateur : admin@test.com`}
        </pre>
      </div>
    </div>
  );
}
