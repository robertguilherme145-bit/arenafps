import { useQueries, useQuery } from "@tanstack/react-query";
import { getTournamentRanking, getTournamentStatistics, getTournaments } from "../services/api";

export function useTournaments() {
  return useQuery({
    queryKey: ["tournaments"],
    queryFn: getTournaments
  });
}

export function useTournamentInsights(tournamentId: number) {
  return useQueries({
    queries: [
      {
        queryKey: ["ranking", tournamentId],
        queryFn: () => getTournamentRanking(tournamentId)
      },
      {
        queryKey: ["statistics", tournamentId],
        queryFn: () => getTournamentStatistics(tournamentId)
      }
    ]
  });
}
