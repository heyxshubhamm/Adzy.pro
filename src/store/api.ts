import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface User {
  id:             string;
  username:       string;
  email:          string;
  is_seller:      boolean;
  is_banned:      boolean;
  risk_score:     number;
  trust_score:    number;
  kyc_verified:   boolean;
  wallet_balance: number;
  wallet_frozen:  boolean;
  country:        string;
  risk_level:     'low' | 'medium' | 'high' | 'critical';
  created_at:     string;
}

export interface Gig {
  id:              string;
  title:           string;
  seller_id:       string;
  seller_username: string;
  category:        string;
  price:           number;
  status:          'pending' | 'approved' | 'rejected' | 'suspended' | 'flagged';
  nsfw_score:      number;
  spam_score:      number;
  quality_score:   number;
  flag_count:      number;
  created_at:      string;
}

export interface FraudAlert {
  id:            string;
  user_id:       string;
  user_username: string;
  alert_type:    string;
  severity:      number;
  details:       any;
  resolved:      boolean;
  ip_address:    string;
  created_at:    string;
}

export interface DashboardMetrics {
  total_users:       number;
  new_users_today:   number;
  banned_users:      number;
  frozen_wallets:    number;
  pending_gigs:      number;
  flagged_gigs:      number;
  volume_today:      number;
  volume_week:       number;
  commission_week:   number;
  aml_flagged_week:  number;
  open_fraud_alerts: number;
  high_risk_alerts:  number;
  overdue_disputes:  number;
}

export const marketplaceApi = createApi({
  reducerPath: 'marketplaceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('auth_token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['User', 'Gig', 'Transaction', 'FraudAlert', 'Dashboard', 'HomepageSection', 'Coupon', 'SupportTicket', 'ComplianceRecord', 'Payment', 'Withdrawal', 'Order', 'Category', 'Automation', 'Config', 'Audit', 'Analytics', 'CMS', 'Auth'],
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardMetrics, void>({
      query: () => 'admin/dashboard/',
      providesTags: ['Dashboard'],
    }),
    getUsers: builder.query<User[], { search?: string; is_banned?: boolean }>({
      query: (params) => ({ url: 'admin/users/', params }),
      providesTags: ['User'],
    }),
    updateUser: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({ url: `admin/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    getGigs: builder.query<Gig[], string | void>({
      query: (q) => ({ url: 'gigs/', params: { q } }),
      providesTags: ['Gig'],
    }),
    getSearchGigs: builder.query<any, any>({
      query: (params) => ({ url: 'gigs/', params }),
      providesTags: ['Gig'],
    }),
    getGigBySlug: builder.query<any, string>({
      query: (slug) => `gigs/slug/${slug}`,
      providesTags: ['Gig'],
    }),
    getUserStats: builder.query<any, void>({
      query: () => 'orders/stats',
      providesTags: ['Order', 'Dashboard'],
    }),
    updateGig: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({ url: `admin/gigs/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Gig'],
    }),
    getFraudAlerts: builder.query<FraudAlert[], { resolved?: boolean }>({
      query: (params) => ({ url: 'admin/fraud/', params }),
      providesTags: ['FraudAlert'],
    }),
    
    // ── Inbox & Trust Protocol ──────────────────────────────────────────────
    getThreads: builder.query<any[], { archived?: boolean }>({
      query: (params) => ({ url: 'inbox/threads', params }),
      providesTags: (result) => result ? [...result.map(({ id }: any) => ({ type: 'Audit' as const, id })), 'Audit'] : ['Audit'],
    }),
    getThread: builder.query<any, string>({
      query: (id) => `inbox/threads/${id}`,
      providesTags: (result, error, id) => [{ type: 'Audit', id }],
    }),
    sendMessage: builder.mutation<any, { threadId: string; body: string; attachment_url?: string }>({
      query: ({ threadId, ...body }) => ({ url: `inbox/threads/${threadId}/messages`, method: 'POST', body }),
      invalidatesTags: (result, error, { threadId }) => [{ type: 'Audit', id: threadId }],
    }),
    markThreadRead: builder.mutation<void, string>({
      query: (id) => ({ url: `inbox/threads/${id}/read`, method: 'PATCH' }),
      invalidatesTags: (result, error, id) => [{ type: 'Audit', id }],
    }),

    // ── Supply Chain (Orders) ───────────────────────────────────────────────
    getOrder: builder.query<any, string>({
      query: (id) => `orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),
    deliverOrder: builder.mutation<any, { orderId: string; proof_url: string; notes?: string }>({
      query: ({ orderId, ...body }) => ({ url: `orders/${orderId}/deliver`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { orderId }) => [{ type: 'Order', id: orderId }],
    }),
    completeOrder: builder.mutation<any, string>({
      query: (orderId) => ({ url: `orders/${orderId}/complete`, method: 'POST' }),
      invalidatesTags: (result, error, id) => [{ type: 'Order', id }],
    }),
    
    // ── Trust Protocol (Disputes) ───────────────────────────────────────────
    getDispute: builder.query<any, string>({
      query: (orderId) => `orders/${orderId}/dispute`,
      providesTags: (result, error, id) => [{ type: 'Audit', id: `dispute-${id}` }],
    }),
    openDispute: builder.mutation<any, { orderId: string; reason: string; evidence_url?: string }>({
      query: ({ orderId, ...body }) => ({ url: `orders/${orderId}/dispute`, method: 'POST', body }),
      invalidatesTags: (result, error, { orderId }) => [{ type: 'Order', id: orderId }, { type: 'Audit', id: `dispute-${orderId}` }],
    }),
    
    // Mutations
    banUser: builder.mutation<{ status: string }, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `admin/users/${id}/ban`, method: 'POST', body: { reason } }),
      invalidatesTags: ['User', 'Dashboard'],
    }),
    approveGig: builder.mutation<{ status: string }, string>({
      query: (id) => ({ url: `admin/gigs/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['Gig', 'Dashboard'],
    }),
    resolveFraudAlert: builder.mutation<{ status: string }, string>({
      query: (id) => ({ url: `admin/fraud/${id}/resolve`, method: 'POST' }),
      invalidatesTags: ['FraudAlert', 'Dashboard'],
    }),
    // ── Homepage Configuration ──────────────────────────────────────────────
    getHomepageSections: builder.query<any[], void>({
      query: () => '/admin/config/homepage/sections',
      providesTags: ['HomepageSection'],
    }),
    updateHomepageSection: builder.mutation<any, { id: string; is_visible?: boolean; sort_order?: number; config?: any }>({
      query: ({ id, ...patch }) => ({
        url: `/admin/config/homepage/sections/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: ['HomepageSection'],
    }),
    reorderHomepageSections: builder.mutation<void, string[]>({
      query: (ordered_ids) => ({
        url: '/admin/config/homepage/reorder',
        method: 'PATCH',
        body: { ordered_ids },
      }),
      invalidatesTags: ['HomepageSection'],
    }),
    syncHomepage: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/admin/config/homepage/sync',
        method: 'POST',
      }),
    }),

    // ── Coupon Management ───────────────────────────────────────────────────
    getCoupons: builder.query<any[], void>({
      query: () => '/admin/config/coupons',
      providesTags: ['Coupon'],
    }),
    createCoupon: builder.mutation<any, any>({
      query: (body) => ({
        url: '/admin/config/coupons',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Coupon'],
    }),
    deleteCoupon: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/config/coupons/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Coupon'],
    }),

    // ── Support Center ──────────────────────────────────────────────────────
    getSupportTickets: builder.query<any[], { status?: string; priority?: string }>({
      query: (params) => ({
        url: '/admin/support/tickets',
        params,
      }),
      providesTags: ['SupportTicket'],
    }),
    assignTicket: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/support/tickets/${id}/assign`,
        method: 'POST',
      }),
      invalidatesTags: ['SupportTicket'],
    }),
    getSLABreaches: builder.query<any[], void>({
      query: () => '/admin/support/disputes/sla-breach',
      providesTags: ['SupportTicket'],
    }),

    // ── Compliance Hub ──────────────────────────────────────────────────────
    getComplianceRecords: builder.query<any[], { status?: string }>({
      query: (params) => ({
        url: '/admin/compliance/records',
        params,
      }),
      providesTags: ['ComplianceRecord'],
    }),
    verifyCompliance: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/compliance/records/${id}/verify`,
        method: 'POST',
      }),
      invalidatesTags: ['ComplianceRecord', 'User'],
    }),

    // ── Treasury (Payments) ─────────────────────────────────────────────────
    getPayments: builder.query<{ payments: any[]; total: number }, { page: number; limit: number; search?: string; status?: string }>({
      query: (params) => ({
        url: '/admin/payments',
        params,
      }),
      providesTags: ['Payment'],
    }),
    releasePayment: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/payments/${id}/release`,
        method: 'POST',
      }),
      invalidatesTags: ['Payment', 'Dashboard'],
    }),
    refundPayment: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/payments/${id}/refund`,
        method: 'POST',
      }),
      invalidatesTags: ['Payment', 'Dashboard'],
    }),
    bulkReleasePayments: builder.mutation<any, string[]>({
      query: (payment_ids) => ({
        url: '/admin/payments/bulk-release',
        method: 'POST',
        body: { payment_ids },
      }),
      invalidatesTags: ['Payment', 'Dashboard'],
    }),

    // ── Settlements (Withdrawals) ───────────────────────────────────────────
    getWithdrawals: builder.query<{ items: any[]; total: number }, { status?: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: '/admin/withdrawals/',
        params,
      }),
      providesTags: ['Withdrawal'],
    }),
    processWithdrawal: builder.mutation<any, { id: string; status: string; admin_notes?: string }>({
      query: ({ id, ...body }) => ({
        url: `/admin/withdrawals/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Withdrawal', 'User', 'Dashboard'],
    }),
    markWithdrawalProcessing: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/withdrawals/${id}/mark-processing`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Withdrawal'],
    }),

    // ── Supply Chain (Orders) ───────────────────────────────────────────────
    getOrders: builder.query<{ orders: any[]; total: number }, { page: number; limit: number; status?: string; search?: string; role?: string }>({
      query: (params) => ({
        url: '/admin/orders',
        params,
      }),
      providesTags: ['Order'],
    }),
    updateOrder: builder.mutation<any, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/admin/orders/${id}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Order', 'Dashboard'],
    }),
    resolveOrder: builder.mutation<any, { id: string; resolution: string; admin_note?: string }>({
      query: ({ id, ...body }) => ({
        url: `/admin/orders/${id}/resolve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Order', 'Payment', 'Dashboard'],
    }),

    // ── Taxonomy (Categories) ────────────────────────────────────────────────
    getCategories: builder.query<any[], void>({
      query: () => '/categories',
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<any, any>({
      query: (body) => ({
        url: '/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/admin/categories/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),

    // ── Automations ─────────────────────────────────────────────────────────
    getAutomations: builder.query<any[], void>({
      query: () => '/admin/automations',
      providesTags: ['Automation'],
    }),
    createAutomation: builder.mutation<any, any>({
      query: (body) => ({
        url: '/admin/automations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Automation'],
    }),
    updateAutomation: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/admin/automations/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Automation'],
    }),
    deleteAutomation: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/automations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Automation'],
    }),

    // ── Configuration & Flags ───────────────────────────────────────────────
    getConfigs: builder.query<any[], { category?: string }>({
      query: (params) => ({
        url: '/admin/config/',
        params,
      }),
      providesTags: ['Config'],
    }),
    updateConfig: builder.mutation<any, { key: string; value: any }>({
      query: ({ key, value }) => ({
        url: `/admin/config/${key}`,
        method: 'PATCH',
        body: { value },
      }),
      invalidatesTags: ['Config'],
    }),
    getFlags: builder.query<any[], void>({
      query: () => '/admin/config/flags',
      providesTags: ['Config'],
    }),
    updateFlag: builder.mutation<any, { key: string; [key: string]: any }>({
      query: ({ key, ...body }) => ({
        url: `/admin/config/flags/${key}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Config'],
    }),
    getAuditLogs: builder.query<any[], { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/admin/config/audit-log',
        params,
      }),
      providesTags: ['Audit'],
    }),

    // ── Analytics ──────────────────────────────────────────────────────────
    getAnalyticsDashboard: builder.query<any, void>({
      query: () => '/admin/analytics/dashboard',
      providesTags: ['Analytics'],
    }),
    getSellerChurn: builder.query<any[], { days_inactive?: number }>({
      query: (params) => ({
        url: '/admin/analytics/seller-churn',
        params,
      }),
      providesTags: ['Analytics'],
    }),
    getBuyerLTV: builder.query<any[], void>({
      query: () => '/admin/analytics/buyer-ltv',
      providesTags: ['Analytics'],
    }),
    getTopSellersAnalytics: builder.query<any[], { limit?: number }>({
      query: (params) => ({
        url: '/admin/analytics/top-sellers',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    // ── CMS (Content Management) ───────────────────────────────────────────
    getCMSPages: builder.query<any[], void>({
      query: () => '/admin/cms/pages',
      providesTags: ['CMS'],
    }),
    getCMSPage: builder.query<any, string>({
      query: (id) => `/admin/cms/pages/${id}`,
      providesTags: ['CMS'],
    }),
    createCMSPage: builder.mutation<any, any>({
      query: (body) => ({
        url: '/admin/cms/pages',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CMS'],
    }),
    updateCMSPage: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/admin/cms/pages/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['CMS'],
    }),
    deleteCMSPage: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/cms/pages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CMS'],
    }),
    getSitemapEntries: builder.query<any[], void>({
      query: () => '/admin/cms/sitemap',
      providesTags: ['CMS'],
    }),
    createSitemapEntry: builder.mutation<any, any>({
      query: (body) => ({
        url: '/admin/cms/sitemap',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CMS'],
    }),
    deleteSitemapEntry: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/cms/sitemap/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CMS'],
    }),

    // ── Authentication ──────────────────────────────────────────────────────
    login: builder.mutation<any, any>({
      query: (credentials) => ({
        url: 'auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth', 'User', 'Dashboard'],
    }),
    register: builder.mutation<any, any>({
      query: (user) => ({
        url: 'auth/register',
        method: 'POST',
        body: user,
      }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: 'auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'User', 'Dashboard'],
    }),
    getMe: builder.query<any, void>({
      query: () => 'auth/me',
      providesTags: ['Auth'],
    }),
    verifyEmail: builder.query<any, { token: string; user_id: string }>({
      query: (params) => ({
        url: 'auth/verify-email',
        params,
      }),
    }),
    resendVerification: builder.mutation<any, { email: string }>({
      query: (body) => ({
        url: 'auth/resend-verification',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetUsersQuery,
  useUpdateUserMutation,
  useGetGigsQuery,
  useUpdateGigMutation,
  useGetFraudAlertsQuery,
  useResolveFraudAlertMutation,
  
  // Growth
  useGetHomepageSectionsQuery,
  useUpdateHomepageSectionMutation,
  useReorderHomepageSectionsMutation,
  useSyncHomepageMutation,
  useGetCouponsQuery,
  useCreateCouponMutation,
  useDeleteCouponMutation,
  useGetSupportTicketsQuery,
  useAssignTicketMutation,
  useGetSLABreachesQuery,
  useGetComplianceRecordsQuery,
  useVerifyComplianceMutation,
  useGetPaymentsQuery,
  useReleasePaymentMutation,
  useRefundPaymentMutation,
  useBulkReleasePaymentsMutation,
  useGetWithdrawalsQuery,
  useProcessWithdrawalMutation,
  useMarkWithdrawalProcessingMutation,
  useGetOrdersQuery,
  useUpdateOrderMutation,
  useResolveOrderMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetAutomationsQuery,
  useCreateAutomationMutation,
  useUpdateAutomationMutation,
  useDeleteAutomationMutation,
  useGetConfigsQuery,
  useUpdateConfigMutation,
  useGetFlagsQuery,
  useUpdateFlagMutation,
  useGetAuditLogsQuery,
  useGetSearchGigsQuery,
  useGetGigBySlugQuery,
  useGetUserStatsQuery,
  useGetThreadsQuery,
  useGetThreadQuery,
  useSendMessageMutation,
  useMarkThreadReadMutation,
  useGetOrderQuery,
  useDeliverOrderMutation,
  useCompleteOrderMutation,
  useGetDisputeQuery,
  useOpenDisputeMutation,
  // Auth
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useVerifyEmailQuery,
  useResendVerificationMutation,
} = marketplaceApi;
