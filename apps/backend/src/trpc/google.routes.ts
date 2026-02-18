import { TRPCError } from '@trpc/server';
import { z } from 'zod/v4';

import { env } from '../env';
import * as orgQueries from '../queries/organization.queries';
import { adminProtectedProcedure, publicProcedure } from './trpc';

export const googleRoutes = {
	isSetup: publicProcedure.query(async () => {
		if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
			return true;
		}
		const org = await orgQueries.getFirstOrganization();
		return !!(org?.googleClientId && org?.googleClientSecret);
	}),
	getSettings: adminProtectedProcedure.query(async () => {
		const org = await orgQueries.getFirstOrganization();
		const usingDbOverride = !!(org?.googleClientId && org?.googleClientSecret);
		return {
			clientId: org?.googleClientId || env.GOOGLE_CLIENT_ID || '',
			clientSecret: org?.googleClientSecret || env.GOOGLE_CLIENT_SECRET || '',
			authDomains: org?.googleAuthDomains || env.GOOGLE_AUTH_DOMAINS || '',
			usingDbOverride,
		};
	}),
	updateSettings: adminProtectedProcedure
		.input(
			z.object({
				clientId: z.string(),
				clientSecret: z.string(),
				authDomains: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const org = await orgQueries.getFirstOrganization();
			if (!org) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'No organization found' });
			}
			await orgQueries.updateGoogleSettings(org.id, {
				googleClientId: input.clientId || null,
				googleClientSecret: input.clientSecret || null,
				googleAuthDomains: input.authDomains || null,
			});
			return { success: true };
		}),
};
