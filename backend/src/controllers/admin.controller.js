import {
  approveAdminEntry,
  cancelAdminEntry,
  closeAdminPenalty,
  createAdminDispute,
  createAdminTicket,
  getAdminDashboard,
  listAdminAuditLogs,
  listAdminDisputes,
  listAdminEntries,
  listAdminLineup,
  listAdminPenalties,
  listAdminPayments,
  listAdminPlayers,
  listAdminTickets,
  listAdminTeams,
  openAdminPenalty,
  saveAdminLineup,
  sendAdminNotification,
  updateAdminEntryPayment,
  updateAdminDispute,
  updateAdminPayment,
  updateAdminPlayer,
  updateAdminTicket,
  updateAdminTeam
} from "../services/admin.service.js";

export async function dashboard(req, res) {
  try {
    const data = await getAdminDashboard();
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function entries(req, res) {
  try {
    const data = await listAdminEntries({
      tournamentId: req.query.tournament_id ? Number(req.query.tournament_id) : undefined,
      status: req.query.status,
      paymentStatus: req.query.payment_status
    });
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function approveEntry(req, res) {
  try {
    await approveAdminEntry(req.user, Number(req.params.id));
    return res.json({ mensagem: "Inscricao aprovada." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function cancelEntry(req, res) {
  try {
    await cancelAdminEntry(req.user, Number(req.params.id));
    return res.json({ mensagem: "Inscricao cancelada." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function updateEntryPayment(req, res) {
  try {
    await updateAdminEntryPayment(req.user, Number(req.params.id), req.body.payment_status);
    return res.json({ mensagem: "Pagamento da inscricao atualizado." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function payments(req, res) {
  try {
    const data = await listAdminPayments({
      tournamentId: req.query.tournament_id ? Number(req.query.tournament_id) : undefined,
      status: req.query.status
    });
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function updatePayment(req, res) {
  try {
    await updateAdminPayment(req.user, Number(req.params.id), req.body.status);
    return res.json({ mensagem: "Pagamento atualizado." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function teams(req, res) {
  try {
    const data = await listAdminTeams();
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function updateTeam(req, res) {
  try {
    await updateAdminTeam(req.user, Number(req.params.id), req.body);
    return res.json({ mensagem: "Equipe atualizada." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function players(req, res) {
  try {
    const data = await listAdminPlayers({
      status: req.query.status,
      teamId: req.query.team_id ? Number(req.query.team_id) : undefined
    });
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function updatePlayer(req, res) {
  try {
    await updateAdminPlayer(req.user, Number(req.params.id), req.body);
    return res.json({ mensagem: "Jogador atualizado." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function lineup(req, res) {
  try {
    const data = await listAdminLineup(Number(req.params.entryId));
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function saveLineup(req, res) {
  try {
    const data = await saveAdminLineup(
      req.user,
      Number(req.params.entryId),
      req.body.titulares ?? [],
      req.body.reservas ?? []
    );
    return res.json({ mensagem: "Lineup salva com sucesso.", jogadores: data });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function sendNotification(req, res) {
  try {
    await sendAdminNotification(req.user, req.body);
    return res.json({ mensagem: "Notificacao enviada." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function auditLogs(req, res) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const data = await listAdminAuditLogs(limit);
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function penalties(req, res) {
  try {
    const data = await listAdminPenalties();
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function createPenalty(req, res) {
  try {
    await openAdminPenalty(req.user, req.body);
    return res.status(201).json({ mensagem: "Penalidade registrada." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function resolvePenalty(req, res) {
  try {
    await closeAdminPenalty(req.user, Number(req.params.id), req.body.notes);
    return res.json({ mensagem: "Penalidade encerrada." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function tickets(req, res) {
  try {
    const data = await listAdminTickets();
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function createTicket(req, res) {
  try {
    await createAdminTicket(req.user, req.body);
    return res.status(201).json({ mensagem: "Ticket criado." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function updateTicket(req, res) {
  try {
    await updateAdminTicket(req.user, Number(req.params.id), req.body);
    return res.json({ mensagem: "Ticket atualizado." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function disputes(req, res) {
  try {
    const data = await listAdminDisputes();
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function createDispute(req, res) {
  try {
    await createAdminDispute(req.user, req.body);
    return res.status(201).json({ mensagem: "Disputa registrada." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}

export async function updateDispute(req, res) {
  try {
    await updateAdminDispute(req.user, Number(req.params.id), req.body);
    return res.json({ mensagem: "Disputa atualizada." });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
}
