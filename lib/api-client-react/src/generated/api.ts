// @ts-nocheck
/**
 * Supabase-backed API hooks — drop-in replacement for Orval-generated hooks.
 * Maintains identical export names and return types so components don't need changes.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
} from "@tanstack/react-query";
import { getSupabase } from "../supabase";
// Lazy getter — supabase is not available at module-load time
function supabase() { return getSupabase(); }
import type {
  AuthResponse,
  Booking,
  BookingInput,
  BookingStatusUpdate,
  CustomerDashboard,
  IssueAnalysisInput,
  IssueAnalysisResult,
  ListBookingsParams,
  ListReviewsParams,
  ListTechniciansParams,
  LoginInput,
  MessageResponse,
  RegisterInput,
  Review,
  ReviewInput,
  ServiceCategory,
  Technician,
  TechnicianBriefInput,
  TechnicianBriefResult,
  TechnicianDashboard,
  TechnicianInput,
  TechnicianLocationUpdate,
  TechnicianStatusUpdate,
  TechnicianUpdate,
  TrackingInfo,
  User,
  UserUpdate,
} from "./api.schemas";

// Re-export all types and enums so other imports still work
export * from "./api.schemas";

// ============================================================================
// Supabase helper: get current session
// ============================================================================
async function getSession() {
  const { data } = await supabase().auth.getSession();
  return data.session;
}

async function getAccessToken(): Promise<string | undefined> {
  const session = await getSession();
  return session?.access_token;
}

// ============================================================================
// Auth hooks
// ============================================================================

export function useRegister<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      AuthResponse,
      TError,
      { data: RegisterInput },
      TContext
    >;
  },
): UseMutationResult<AuthResponse, TError, { data: RegisterInput }, TContext> {
  return useMutation({
    mutationKey: ["register"],
    mutationFn: async ({ data }) => {
      const { data: authData, error } = await supabase().auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role,
            phone: data.phone ?? null,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!authData.user) throw new Error("Registration failed");

      // Create profile row
      const { error: profileError } = await supabase().from("profiles").upsert({
        id: authData.user.id,
        name: data.name,
        role: data.role,
        phone: data.phone ?? null,
      });
      if (profileError) console.error("Profile creation error:", profileError);

      const user: User = {
        id: "", // Will be set from profile
        name: data.name,
        email: data.email,
        role: data.role as User["role"],
        phone: data.phone ?? undefined,
        createdAt: new Date().toISOString(),
      };

      // Fetch the profile to get the actual ID
      const { data: profile } = await supabase()
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profile) {
        user.id = profile.id ?? "";
        user.name = profile.name ?? data.name;
        user.role = profile.role ?? data.role;
        user.phone = profile.phone ?? undefined;
        user.address = profile.address ?? undefined;
        user.avatarUrl = profile.avatar_url ?? undefined;
      }

      return {
        user,
        token: authData.session?.access_token ?? "",
      };
    },
    ...options?.mutation,
  });
}

export function useLogin<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      AuthResponse,
      TError,
      { data: LoginInput },
      TContext
    >;
  },
): UseMutationResult<AuthResponse, TError, { data: LoginInput }, TContext> {
  return useMutation({
    mutationKey: ["login"],
    mutationFn: async ({ data }) => {
      const { data: authData, error } = await supabase().auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw new Error(error.message);
      if (!authData.user) throw new Error("Login failed");

      // Fetch profile
      const { data: profile } = await supabase()
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      const user: User = {
        id: profile?.id ?? authData.user.id ?? "",
        name: profile?.name ?? authData.user.email ?? "",
        email: authData.user.email ?? data.email,
        role: (profile?.role ?? "customer") as User["role"],
        phone: profile?.phone ?? undefined,
        address: profile?.address ?? undefined,
        avatarUrl: profile?.avatar_url ?? undefined,
        createdAt: authData.user.created_at ?? new Date().toISOString(),
      };

      return {
        user,
        token: authData.session?.access_token ?? "",
      };
    },
    ...options?.mutation,
  });
}

export function useLogout<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<MessageResponse, TError, void, TContext>;
  },
): UseMutationResult<MessageResponse, TError, void, TContext> {
  return useMutation({
    mutationKey: ["logout"],
    mutationFn: async () => {
      await supabase().auth.signOut();
      return { message: "Logged out" };
    },
    ...options?.mutation,
  });
}

// ============================================================================
// Query key helpers (used by components and realtime invalidation)
// ============================================================================

export const getGetMeQueryKey = () => ["/api/auth/me"] as const;
export const getListServiceCategoriesQueryKey = () => ["/api/service-categories"] as const;
export const getListTechniciansQueryKey = (params?: ListTechniciansParams) =>
  ["/api/technicians", ...(params ? [params] : [])] as const;
export const getGetMyTechnicianProfileQueryKey = () => ["/api/technicians/me"] as const;
export const getGetTechnicianQueryKey = (id: number) => [`/api/technicians/${id}`] as const;
export const getGetTechnicianReviewsQueryKey = (id: number) => [`/api/technicians/${id}/reviews`] as const;
export const getListBookingsQueryKey = (params?: ListBookingsParams) =>
  ["/api/bookings", ...(params ? [params] : [])] as const;
export const getGetBookingQueryKey = (id: number) => [`/api/bookings/${id}`] as const;
export const getGetBookingTrackingQueryKey = (id: number) => [`/api/bookings/${id}/tracking`] as const;
export const getListReviewsQueryKey = (params?: ListReviewsParams) =>
  ["/api/reviews", ...(params ? [params] : [])] as const;
export const getGetCustomerDashboardQueryKey = () => ["/api/dashboard/customer"] as const;
export const getGetTechnicianDashboardQueryKey = () => ["/api/dashboard/technician"] as const;
export const getGetAnalyticsSummaryQueryKey = () => ["/api/analytics/summary"] as const;

// ============================================================================
// Auth query hooks
// ============================================================================

export function useGetMe<
  TData = User,
  TError = unknown,
>(
  options?: {
    query?: UseQueryOptions<User, TError, TData>;
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getGetMeQueryKey();
  return useQuery({
    queryKey,
    queryFn: async (): Promise<User> => {
      const { data: { user: authUser } } = await supabase().auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const { data: profile } = await supabase()
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      return {
        id: profile?.id ?? authUser.id ?? "",
        name: profile?.name ?? authUser.email ?? "",
        email: authUser.email ?? "",
        role: (profile?.role ?? "customer") as User["role"],
        phone: profile?.phone ?? undefined,
        address: profile?.address ?? undefined,
        avatarUrl: profile?.avatar_url ?? undefined,
        createdAt: authUser.created_at ?? new Date().toISOString(),
      };
    },
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

// ============================================================================
// User hooks
// ============================================================================

export function useGetUser<
  TData = User,
  TError = unknown,
>(
  id: string,
  options?: { query?: UseQueryOptions<User, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = [`/api/users/${id}`];
  return useQuery({
    queryKey,
    queryFn: async (): Promise<User> => {
      const { data, error } = await supabase()
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        name: data.name ?? "",
        email: data.email ?? "",
        role: data.role ?? "customer",
        phone: data.phone ?? undefined,
        address: data.address ?? undefined,
        avatarUrl: data.avatar_url ?? undefined,
        createdAt: data.created_at ?? new Date().toISOString(),
      };
    },
    enabled: !!id,
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

export function useUpdateUser<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      User,
      TError,
      { id: string; data: UserUpdate },
      TContext
    >;
  },  ): UseMutationResult<User, TError, { id: string; data: UserUpdate }, TContext> {
  return useMutation({
    mutationKey: ["updateUser"],
    mutationFn: async ({ id, data }) => {
      const updates: Record<string, unknown> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.phone !== undefined) updates.phone = data.phone;
      if (data.address !== undefined) updates.address = data.address;
      if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;

      const { data: updated, error } = await supabase()
        .from("profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return {
        id: updated.id,
        name: updated.name ?? "",
        email: updated.email ?? "",
        role: updated.role ?? "customer",
        phone: updated.phone ?? undefined,
        address: updated.address ?? undefined,
        avatarUrl: updated.avatar_url ?? undefined,
        createdAt: updated.created_at ?? new Date().toISOString(),
      };
    },
    ...options?.mutation,
  });
}

// ============================================================================
// Service categories
// ============================================================================

export function useListServiceCategories<
  TData = ServiceCategory[],
  TError = unknown,
>(
  options?: { query?: UseQueryOptions<ServiceCategory[], TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getListServiceCategoriesQueryKey();
  return useQuery({
    queryKey,
    queryFn: async (): Promise<ServiceCategory[]> => {
      const { data, error } = await supabase()
        .from("service_categories")
        .select("*");
      if (error) throw new Error(error.message);
      return (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        description: c.description,
      }));
    },
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

// ============================================================================
// Technician hooks
// ============================================================================

function mapSupabaseTechnician(row: any, userName?: string): Technician {
  return {
    id: row.id,
    userId: row.user_id,
    name: userName ?? row.name ?? "",
    bio: row.bio ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    profilePictureUrl: row.profile_picture_url ?? undefined,
    skills: row.skills ?? [],
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    isAvailable: row.is_available ?? true,
    completedJobs: row.completed_jobs ?? 0,
    hourlyRate: row.hourly_rate ?? 0,
    responseTime: row.response_time ?? "30 min",
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    lastLocationAt: row.last_location_at ?? undefined,
    currentStatus: row.current_status ?? "offline",
    verificationBadges: row.verification_badges ?? [],
    categoryIds: row.category_ids ?? [],
    profession: row.profession ?? [],
    servicesOffered: row.services_offered ?? {},
    yearsExperience: row.years_experience ?? undefined,
    certifications: row.certifications ?? [],
    previousCompany: row.previous_company ?? undefined,
    areasOfExpertise: row.areas_of_expertise ?? [],
    languagesSpoken: row.languages_spoken ?? [],
    visitCharge: row.visit_charge ?? undefined,
    perJobRate: row.per_job_rate ?? undefined,
    inspectionCharge: row.inspection_charge ?? undefined,
    emergencyCharge: row.emergency_charge ?? undefined,
    weekendCharge: row.weekend_charge ?? undefined,
    nightCharge: row.night_charge ?? undefined,
    workingDays: row.working_days ?? [],
    workingHoursStart: row.working_hours_start ?? undefined,
    workingHoursEnd: row.working_hours_end ?? undefined,
    emergencyAvailable: row.emergency_available ?? false,
    vacationMode: row.vacation_mode ?? false,
    maxDailyBookings: row.max_daily_bookings ?? undefined,
    serviceRadius: row.service_radius ?? undefined,
    serviceCity: row.service_city ?? undefined,
    pinCode: row.pin_code ?? undefined,
    gender: row.gender ?? undefined,
    dateOfBirth: row.date_of_birth ?? undefined,
  };
}

export function useListTechnicians<
  TData = Technician[],
  TError = unknown,
>(
  params?: ListTechniciansParams,
  options?: { query?: UseQueryOptions<Technician[], TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getListTechniciansQueryKey(params);
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Technician[]> => {
      let query = supabase
        .from("technicians")
        .select("*, profiles!inner(name)");

      // Default filter: only online/emergency_only
      if (!params?.currentStatus) {
        query = query.in("current_status", ["online", "emergency_only"]);
      } else {
        query = query.eq("current_status", params.currentStatus);
      }

      if (params?.isAvailable !== undefined) {
        query = query.eq("is_available", params.isAvailable);
      }
      if (params?.minRating !== undefined) {
        query = query.gte("rating", params.minRating);
      }
      if (params?.maxRate !== undefined) {
        query = query.lte("hourly_rate", params.maxRate);
      }
      if (params?.emergencyAvailable) {
        query = query.eq("emergency_available", true);
      }
      if (params?.minExperience !== undefined) {
        query = query.gte("years_experience", params.minExperience);
      }
      if (params?.categoryId !== undefined) {
        query = query.contains("category_ids", [params.categoryId]);
      }
      if (params?.verified) {
        query = query.not("verification_badges", "eq", "[]");
      }
      if (params?.search) {
        // PostgREST text search: use or-filter across text columns
        const term = params.search;
        query = query.or(`name.ilike.%${term}%,bio.ilike.%${term}%`);
      }

      // Sort
      if (params?.sortBy) {
        switch (params.sortBy) {
          case "highest_rated": query = query.order("rating", { ascending: false }); break;
          case "lowest_price": query = query.order("hourly_rate", { ascending: true }); break;
          case "most_experienced": query = query.order("years_experience", { ascending: false }); break;
          default: query = query.order("rating", { ascending: false });
        }
      } else {
        query = query.order("rating", { ascending: false });
      }

      const limit = params?.limit ?? 50;
      query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return (data ?? []).map((row: any) =>
        mapSupabaseTechnician(row, row.profiles?.name),
      );
    },
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

export function useGetMyTechnicianProfile<
  TData = Technician,
  TError = unknown,
>(
  options?: { query?: UseQueryOptions<Technician, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getGetMyTechnicianProfileQueryKey();
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Technician> => {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase()
        .from("technicians")
        .select("*, profiles!inner(name)")
        .eq("user_id", user.id)
        .single();
      if (error) throw new Error(error.message);
      return mapSupabaseTechnician(data, data.profiles?.name);
    },
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

export function useGetTechnician<
  TData = Technician,
  TError = unknown,
>(
  id: number,
  options?: { query?: UseQueryOptions<Technician, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getGetTechnicianQueryKey(id);
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Technician> => {
      const { data, error } = await supabase()
        .from("technicians")
        .select("*, profiles!inner(name)")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return mapSupabaseTechnician(data, data.profiles?.name);
    },
    enabled: !!id,
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

export function useCreateTechnicianProfile<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      Technician,
      TError,
      { data: TechnicianInput },
      TContext
    >;
  },
): UseMutationResult<Technician, TError, { data: TechnicianInput }, TContext> {
  return useMutation({
    mutationKey: ["createTechnicianProfile"],
    mutationFn: async ({ data: input }) => {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if profile already exists
      const { data: existing } = await supabase()
        .from("technicians")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        // Return existing profile
        const { data: row } = await supabase()
          .from("technicians")
          .select("*, profiles!inner(name)")
          .eq("id", existing.id)
          .single();
        return mapSupabaseTechnician(row, row?.profiles?.name);
      }

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        bio: input.bio ?? null,
        profile_picture_url: input.profilePictureUrl ?? null,
        skills: input.skills ?? [],
        hourly_rate: input.hourlyRate ?? 0,
        response_time: input.responseTime ?? "30 min",
        category_ids: input.categoryIds ?? [],
        profession: input.profession ?? [],
        services_offered: input.servicesOffered ?? {},
        years_experience: input.yearsExperience ?? null,
        certifications: input.certifications ?? [],
        previous_company: input.previousCompany ?? null,
        areas_of_expertise: input.areasOfExpertise ?? [],
        languages_spoken: input.languagesSpoken ?? [],
        visit_charge: input.visitCharge ?? null,
        per_job_rate: input.perJobRate ?? null,
        inspection_charge: input.inspectionCharge ?? null,
        emergency_charge: input.emergencyCharge ?? null,
        weekend_charge: input.weekendCharge ?? null,
        night_charge: input.nightCharge ?? null,
        working_days: input.workingDays ?? [],
        working_hours_start: input.workingHoursStart ?? null,
        working_hours_end: input.workingHoursEnd ?? null,
        emergency_available: input.emergencyAvailable ?? false,
        vacation_mode: input.vacationMode ?? false,
        max_daily_bookings: input.maxDailyBookings ?? null,
        service_radius: input.serviceRadius ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        current_status: input.currentStatus ?? "offline",
        verification_badges: input.verificationBadges ?? [],
        service_city: input.serviceCity ?? null,
        pin_code: input.pinCode ?? null,
        gender: input.gender ?? null,
        date_of_birth: input.dateOfBirth ?? null,
      };

      const { data: inserted, error } = await supabase()
        .from("technicians")
        .insert(insertData)
        .select("*, profiles!inner(name)")
        .single();
      if (error) throw new Error(error.message);
      return mapSupabaseTechnician(inserted, inserted.profiles?.name);
    },
    ...options?.mutation,
  });
}

export function useUpdateTechnician<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      Technician,
      TError,
      { id: number; data: TechnicianUpdate },
      TContext
    >;
  },
): UseMutationResult<Technician, TError, { id: number; data: TechnicianUpdate }, TContext> {
  return useMutation({
    mutationKey: ["updateTechnician"],
    mutationFn: async ({ id, data: input }) => {
      const updates: Record<string, unknown> = {};
      if (input.bio !== undefined) updates.bio = input.bio;
      if (input.skills !== undefined) updates.skills = input.skills;
      if (input.hourlyRate !== undefined) updates.hourly_rate = input.hourlyRate;
      if (input.responseTime !== undefined) updates.response_time = input.responseTime;
      if (input.currentStatus !== undefined) updates.current_status = input.currentStatus;
      if (input.categoryIds !== undefined) updates.category_ids = input.categoryIds;
      if (input.profession !== undefined) updates.profession = input.profession;
      if (input.servicesOffered !== undefined) updates.services_offered = input.servicesOffered;
      if (input.yearsExperience !== undefined) updates.years_experience = input.yearsExperience;
      if (input.certifications !== undefined) updates.certifications = input.certifications;
      if (input.previousCompany !== undefined) updates.previous_company = input.previousCompany;
      if (input.areasOfExpertise !== undefined) updates.areas_of_expertise = input.areasOfExpertise;
      if (input.languagesSpoken !== undefined) updates.languages_spoken = input.languagesSpoken;
      if (input.visitCharge !== undefined) updates.visit_charge = input.visitCharge;
      if (input.perJobRate !== undefined) updates.per_job_rate = input.perJobRate;
      if (input.inspectionCharge !== undefined) updates.inspection_charge = input.inspectionCharge;
      if (input.emergencyCharge !== undefined) updates.emergency_charge = input.emergencyCharge;
      if (input.weekendCharge !== undefined) updates.weekend_charge = input.weekendCharge;
      if (input.nightCharge !== undefined) updates.night_charge = input.nightCharge;
      if (input.workingDays !== undefined) updates.working_days = input.workingDays;
      if (input.workingHoursStart !== undefined) updates.working_hours_start = input.workingHoursStart;
      if (input.workingHoursEnd !== undefined) updates.working_hours_end = input.workingHoursEnd;
      if (input.emergencyAvailable !== undefined) updates.emergency_available = input.emergencyAvailable;
      if (input.vacationMode !== undefined) updates.vacation_mode = input.vacationMode;
      if (input.maxDailyBookings !== undefined) updates.max_daily_bookings = input.maxDailyBookings;
      if (input.serviceRadius !== undefined) updates.service_radius = input.serviceRadius;
      if (input.latitude !== undefined) updates.latitude = input.latitude;
      if (input.longitude !== undefined) updates.longitude = input.longitude;
      if (input.serviceCity !== undefined) updates.service_city = input.serviceCity;
      if (input.pinCode !== undefined) updates.pin_code = input.pinCode;
      if (input.gender !== undefined) updates.gender = input.gender;
      if (input.dateOfBirth !== undefined) updates.date_of_birth = input.dateOfBirth;

      const { data: updated, error } = await supabase()
        .from("technicians")
        .update(updates)
        .eq("id", id)
        .select("*, profiles!inner(name)")
        .single();
      if (error) throw new Error(error.message);
      return mapSupabaseTechnician(updated, updated.profiles?.name);
    },
    ...options?.mutation,
  });
}

export function useUpdateTechnicianLocation<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      Technician,
      TError,
      { id: number; data: TechnicianLocationUpdate },
      TContext
    >;
  },
): UseMutationResult<Technician, TError, { id: number; data: TechnicianLocationUpdate }, TContext> {
  return useMutation({
    mutationKey: ["updateTechnicianLocation"],
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await supabase()
        .from("technicians")
        .update({
          latitude: data.latitude,
          longitude: data.longitude,
          last_location_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*, profiles!inner(name)")
        .single();
      if (error) throw new Error(error.message);
      return mapSupabaseTechnician(updated, updated.profiles?.name);
    },
    ...options?.mutation,
  });
}

export function useUpdateTechnicianStatus<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      Technician,
      TError,
      { id: number; data: TechnicianStatusUpdate },
      TContext
    >;
  },
): UseMutationResult<Technician, TError, { id: number; data: TechnicianStatusUpdate }, TContext> {
  return useMutation({
    mutationKey: ["updateTechnicianStatus"],
    mutationFn: async ({ id, data }) => {
      const isAvailable = data.currentStatus === "online" || data.currentStatus === "emergency_only";
      const { data: updated, error } = await supabase()
        .from("technicians")
        .update({
          current_status: data.currentStatus,
          is_available: isAvailable,
        })
        .eq("id", id)
        .select("*, profiles!inner(name)")
        .single();
      if (error) throw new Error(error.message);
      return mapSupabaseTechnician(updated, updated.profiles?.name);
    },
    ...options?.mutation,
  });
}

// ============================================================================
// Review hooks
// ============================================================================

export function useGetTechnicianReviews<
  TData = Review[],
  TError = unknown,
>(
  id: number,
  options?: { query?: UseQueryOptions<Review[], TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getGetTechnicianReviewsQueryKey(id);
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase()
        .from("reviews")
        .select("*, profiles!customer_id(name)")
        .eq("technician_id", id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        customerId: r.customer_id,
        technicianId: r.technician_id,
        bookingId: r.booking_id,
        rating: r.rating,
        comment: r.comment,
        customerName: r.profiles?.name ?? null,
        technicianName: null,
        createdAt: r.created_at,
      }));
    },
    enabled: !!id,
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

export function useListReviews<
  TData = Review[],
  TError = unknown,
>(
  params?: ListReviewsParams,
  options?: { query?: UseQueryOptions<Review[], TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getListReviewsQueryKey(params);
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Review[]> => {
      const limit = params?.limit ?? 20;
      const { data, error } = await supabase()
        .from("reviews")
        .select("*, profiles!customer_id(name)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        customerId: r.customer_id,
        technicianId: r.technician_id,
        bookingId: r.booking_id,
        rating: r.rating,
        comment: r.comment,
        customerName: r.profiles?.name ?? null,
        technicianName: null,
        createdAt: r.created_at,
      }));
    },
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

export function useCreateReview<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      Review,
      TError,
      { data: ReviewInput },
      TContext
    >;
  },
): UseMutationResult<Review, TError, { data: ReviewInput }, TContext> {
  return useMutation({
    mutationKey: ["createReview"],
    mutationFn: async ({ data: input }) => {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check duplicate
      const { data: existing } = await supabase()
        .from("reviews")
        .select("id")
        .eq("booking_id", input.bookingId)
        .limit(1);
      if (existing && existing.length > 0) {
        throw new Error("A review already exists for this booking");
      }

      const { data: inserted, error } = await supabase()
        .from("reviews")
        .insert({
          customer_id: user.id,
          technician_id: input.technicianId,
          booking_id: input.bookingId,
          rating: input.rating,
          comment: input.comment,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      // Update technician rating
      const { data: allReviews } = await supabase()
        .from("reviews")
        .select("rating")
        .eq("technician_id", input.technicianId);
      if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
        await supabase()
          .from("technicians")
          .update({ rating: Math.round(avg * 10) / 10, review_count: allReviews.length })
          .eq("id", input.technicianId);
      }

      const { data: profile } = await supabase()
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      return {
        id: inserted.id,
        customerId: inserted.customer_id,
        technicianId: inserted.technician_id,
        bookingId: inserted.booking_id,
        rating: inserted.rating,
        comment: inserted.comment,
        customerName: profile?.name ?? null,
        technicianName: null,
        createdAt: inserted.created_at,
      };
    },
    ...options?.mutation,
  });
}

// ============================================================================
// Booking hooks
// ============================================================================

function mapSupabaseBooking(row: any, enrichments?: { customerName?: string; technicianName?: string; categoryName?: string }): Booking {
  return {
    id: row.id,
    customerId: row.customer_id,
    technicianId: row.technician_id,
    categoryId: row.category_id,
    status: row.status,
    issueDescription: row.issue_description,
    address: row.address ?? undefined,
    scheduledAt: row.scheduled_at,
    estimatedCost: row.estimated_cost ?? 0,
    finalCost: row.final_cost ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    customerName: enrichments?.customerName ?? undefined,
    technicianName: enrichments?.technicianName ?? undefined,
    categoryName: enrichments?.categoryName ?? undefined,
  };
}

export function useListBookings<
  TData = Booking[],
  TError = unknown,
>(
  params?: ListBookingsParams,
  options?: { query?: UseQueryOptions<Booking[], TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getListBookingsQueryKey(params);
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Booking[]> => {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Determine role: check if user is a technician
      const { data: techProfile } = await supabase()
        .from("technicians")
        .select("id")
        .eq("user_id", user.id)
        .single();

      const role = params?.role ?? (techProfile ? "technician" : "customer");

      let query = supabase().from("bookings").select("*");

      if (role === "technician" && techProfile) {
        query = query.eq("technician_id", techProfile.id);
      } else {
        query = query.eq("customer_id", user.id);
      }

      if (params?.status) {
        query = query.eq("status", params.status);
      }

      query = query.order("created_at", { ascending: true });

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Enrich with names
      const enriched = await Promise.all(
        (data ?? []).map(async (row: any) => {
          const [cust, tech, cat] = await Promise.all([
            supabase().from("profiles").select("name").eq("id", row.customer_id).single(),
            row.technician_id
              ? supabase().from("technicians").select("user_id").eq("id", row.technician_id).single()
              : Promise.resolve({ data: null }),
            supabase().from("service_categories").select("name").eq("id", row.category_id).single(),
          ]);

          let techName: string | null = null;
          if (tech.data) {
            const { data: techUser } = await supabase()
              .from("profiles")
              .select("name")
              .eq("id", tech.data.user_id)
              .single();
            techName = techUser?.name ?? null;
          }

          return mapSupabaseBooking(row, {
            customerName: cust.data?.name ?? null,
            technicianName: techName,
            categoryName: cat.data?.name ?? null,
          });
        }),
      );

      return enriched;
    },
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

export function useGetBooking<
  TData = Booking,
  TError = unknown,
>(
  id: number,
  options?: { query?: UseQueryOptions<Booking, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getGetBookingQueryKey(id);
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Booking> => {
      const { data: row, error } = await supabase()
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);

      const [cust, tech, cat] = await Promise.all([
        supabase().from("profiles").select("name").eq("id", row.customer_id).single(),
        row.technician_id
          ? supabase().from("technicians").select("user_id").eq("id", row.technician_id).single()
          : Promise.resolve({ data: null }),
        supabase().from("service_categories").select("name").eq("id", row.category_id).single(),
      ]);

      let techName: string | null = null;
      if (tech.data) {
        const { data: techUser } = await supabase()
          .from("profiles")
          .select("name")
          .eq("id", tech.data.user_id)
          .single();
        techName = techUser?.name ?? null;
      }

      return mapSupabaseBooking(row, {
        customerName: cust.data?.name ?? null,
        technicianName: techName,
        categoryName: cat.data?.name ?? null,
      });
    },
    enabled: !!id,
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

export function useGetBookingTracking<
  TData = TrackingInfo,
  TError = unknown,
>(
  id: number,
  options?: { query?: UseQueryOptions<TrackingInfo, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getGetBookingTrackingQueryKey(id);
  return useQuery({
    queryKey,
    queryFn: async (): Promise<TrackingInfo> => {
      const { data: booking, error } = await supabase()
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);

      // Get technician location
      let techLat: number | null = null;
      let techLng: number | null = null;
      if (booking.technician_id) {
        const { data: tech } = await supabase()
          .from("technicians")
          .select("latitude, longitude")
          .eq("id", booking.technician_id)
          .single();
        techLat = tech?.latitude ?? null;
        techLng = tech?.longitude ?? null;
      }

      const destLat = booking.dest_latitude;
      const destLng = booking.dest_longitude;

      let distanceKm: number | null = null;
      let etaMinutes = 0;

      if (techLat != null && techLng != null && destLat != null && destLng != null) {
        const R = 6371;
        const dLat = (destLat - techLat) * Math.PI / 180;
        const dLng = (destLng - techLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2
          + Math.cos(techLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const straightLine = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm = Math.round(straightLine * 1.4 * 10) / 10;
        etaMinutes = Math.max(1, Math.round((distanceKm / 30) * 60));
      } else {
        const progress: Record<string, number> = {
          searching: 5, assigned: 10, pending: 15, accepted: 25,
          travelling: 45, arriving: 75, reached: 85, in_progress: 65,
          waiting_for_parts: 70, completed: 100, payment_completed: 100, cancelled: 0,
        };
        const p = progress[booking.status] ?? 0;
        etaMinutes = Math.max(0, Math.round((100 - p) / 10));
      }

      const statusProgress: Record<string, number> = {
        searching: 5, assigned: 10, pending: 15, accepted: 25,
        travelling: 45, arriving: 75, reached: 85, in_progress: 65,
        waiting_for_parts: 70, completed: 100, payment_completed: 100, cancelled: 0,
      };

      return {
        bookingId: booking.id,
        status: booking.status,
        etaMinutes,
        technicianLat: techLat,
        technicianLng: techLng,
        distanceKm,
        progress: statusProgress[booking.status] ?? 0,
        lastUpdated: new Date().toISOString(),
      };
    },
    enabled: !!id,
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

export function useCreateBooking<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      Booking,
      TError,
      { data: BookingInput },
      TContext
    >;
  },
): UseMutationResult<Booking, TError, { data: BookingInput }, TContext> {
  return useMutation({
    mutationKey: ["createBooking"],
    mutationFn: async ({ data: input }) => {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate technician availability
      const { data: tech } = await supabase()
        .from("technicians")
        .select("id, current_status, is_available, vacation_mode")
        .eq("id", input.technicianId)
        .single();
      if (!tech) throw new Error("Technician not found");
      if (tech.vacation_mode) throw new Error("Technician is currently on vacation");
      if (!tech.is_available) throw new Error("Technician is not available");
      if (!["online", "emergency_only"].includes(tech.current_status)) {
        throw new Error(`Technician is currently ${tech.current_status}`);
      }

      // Validate scheduled date
      const scheduledDate = new Date(input.scheduledAt);
      if (isNaN(scheduledDate.getTime())) throw new Error("Invalid scheduled date");
      if (scheduledDate <= new Date()) throw new Error("Scheduled date must be in the future");

      // Validate cost
      if (input.estimatedCost < 0) throw new Error("Estimated cost cannot be negative");

      const { data: inserted, error } = await supabase()
        .from("bookings")
        .insert({
          customer_id: user.id,
          technician_id: input.technicianId,
          category_id: input.categoryId,
          issue_description: input.issueDescription,
          address: input.address ?? null,
          scheduled_at: scheduledDate.toISOString(),
          estimated_cost: input.estimatedCost,
          notes: input.notes ?? null,
          dest_latitude: input.destLatitude ?? null,
          dest_longitude: input.destLongitude ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      return mapSupabaseBooking(inserted);
    },
    ...options?.mutation,
  });
}

export function useUpdateBookingStatus<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      Booking,
      TError,
      { id: number; data: BookingStatusUpdate },
      TContext
    >;
  },
): UseMutationResult<Booking, TError, { id: number; data: BookingStatusUpdate }, TContext> {
  return useMutation({
    mutationKey: ["updateBookingStatus"],
    mutationFn: async ({ id, data: input }) => {
      const updates: Record<string, unknown> = { status: input.status };
      if (input.notes != null) updates.notes = input.notes;
      if (input.finalCost != null) updates.final_cost = input.finalCost;

      const { data: updated, error } = await supabase()
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);

      // Handle technician status changes on completion/cancellation
      if (input.status === "completed" || input.status === "cancelled") {
        const { data: booking } = await supabase()
          .from("bookings")
          .select("technician_id")
          .eq("id", id)
          .single();
        if (booking?.technician_id) {
          await supabase()
            .from("technicians")
            .update({ current_status: "online", is_available: true })
            .eq("id", booking.technician_id);
          if (input.status === "completed") {
            const { data: tech } = await supabase()
              .from("technicians")
              .select("completed_jobs")
              .eq("id", booking.technician_id)
              .single();
            if (tech) {
              await supabase()
                .from("technicians")
                .update({ completed_jobs: (tech.completed_jobs ?? 0) + 1 })
                .eq("id", booking.technician_id);
            }
          }
        }
      }

      return mapSupabaseBooking(updated);
    },
    ...options?.mutation,
  });
}

// ============================================================================
// Dashboard hooks
// ============================================================================

export function useGetCustomerDashboard<
  TData = CustomerDashboard,
  TError = unknown,
>(
  options?: { query?: UseQueryOptions<CustomerDashboard, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getGetCustomerDashboardQueryKey();
  return useQuery({
    queryKey,
    queryFn: async (): Promise<CustomerDashboard> => {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: bookings } = await supabase()
        .from("bookings")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: true });

      const all = bookings ?? [];
      const activeBookings = all.filter((b) => b.status === "accepted" || b.status === "in_progress").length;
      const completedBookings = all.filter((b) => b.status === "completed").length;
      const upcomingBookings = all.filter((b) => b.status === "pending").length;
      const totalSpent = all
        .filter((b) => b.status === "completed")
        .reduce((sum, b) => sum + (b.final_cost ?? b.estimated_cost ?? 0), 0);

      // Enrich recent 5
      const recent = all.slice(-5).reverse();
      const recentBookings = await Promise.all(
        recent.map(async (b) => {
          const [cust, tech, cat] = await Promise.all([
            supabase().from("profiles").select("name").eq("id", b.customer_id).single(),
            b.technician_id
              ? supabase().from("technicians").select("user_id").eq("id", b.technician_id).single()
              : Promise.resolve({ data: null }),
            supabase().from("service_categories").select("name").eq("id", b.category_id).single(),
          ]);
          let techName: string | null = null;
          if (tech.data) {
            const { data: u } = await supabase().from("profiles").select("name").eq("id", tech.data.user_id).single();
            techName = u?.name ?? null;
          }
          return mapSupabaseBooking(b, {
            customerName: cust.data?.name ?? null,
            technicianName: techName,
            categoryName: cat.data?.name ?? null,
          });
        }),
      );

      return {
        activeBookings,
        completedBookings,
        totalSpent: Math.round(totalSpent * 100) / 100,
        upcomingBookings,
        recentBookings,
      };
    },
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

export function useGetTechnicianDashboard<
  TData = TechnicianDashboard,
  TError = unknown,
>(
  options?: { query?: UseQueryOptions<TechnicianDashboard, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getGetTechnicianDashboardQueryKey();
  return useQuery({
    queryKey,
    queryFn: async (): Promise<TechnicianDashboard> => {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: tech } = await supabase()
        .from("technicians")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!tech) {
        return {
          pendingRequests: 0, activeJobs: 0, completedJobs: 0,
          totalEarnings: 0, thisMonthEarnings: 0, rating: 0,
          acceptanceRate: 100, recentBookings: [],
        };
      }

      const { data: bookings } = await supabase()
        .from("bookings")
        .select("*")
        .eq("technician_id", tech.id)
        .order("created_at", { ascending: true });

      const all = bookings ?? [];
      const pendingRequests = all.filter((b) => b.status === "pending").length;
      const activeJobs = all.filter((b) => b.status === "accepted" || b.status === "in_progress").length;
      const completedJobs = all.filter((b) => b.status === "completed").length;

      const completed = all.filter((b) => b.status === "completed");
      const totalEarnings = completed.reduce((s, b) => s + (b.final_cost ?? b.estimated_cost ?? 0), 0);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEarnings = completed
        .filter((b) => new Date(b.created_at) >= startOfMonth)
        .reduce((s, b) => s + (b.final_cost ?? b.estimated_cost ?? 0), 0);

      const nonPending = all.filter((b) => b.status !== "pending").length;
      const accepted = all.filter((b) => b.status !== "pending" && b.status !== "cancelled").length;
      const acceptanceRate = nonPending > 0 ? Math.round((accepted / nonPending) * 100) : 100;

      const recent = all.slice(-5).reverse();
      const recentBookings = await Promise.all(
        recent.map(async (b) => {
          const [cust, cat] = await Promise.all([
            supabase().from("profiles").select("name").eq("id", b.customer_id).single(),
            supabase().from("service_categories").select("name").eq("id", b.category_id).single(),
          ]);
          return mapSupabaseBooking(b, {
            customerName: cust.data?.name ?? null,
            technicianName: user.name ?? null,
            categoryName: cat.data?.name ?? null,
          });
        }),
      );

      return {
        pendingRequests,
        activeJobs,
        completedJobs,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        thisMonthEarnings: Math.round(thisMonthEarnings * 100) / 100,
        rating: tech.rating ?? 0,
        acceptanceRate,
        recentBookings,
      };
    },
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

// ============================================================================
// Analytics hook
// ============================================================================

export function useGetAnalyticsSummary<
  TData = any,
  TError = unknown,
>(
  options?: { query?: UseQueryOptions<any, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getGetAnalyticsSummaryQueryKey();
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [bookingsRes, techRes, custRes] = await Promise.all([
        supabase().from("bookings").select("status, final_cost, estimated_cost, category_id"),
        supabase().from("technicians").select("id, rating"),
        supabase().from("profiles").select("id").eq("role", "customer"),
      ]);

      const bookings = bookingsRes.data ?? [];
      const totalRequests = bookings.length;
      const completedJobs = bookings.filter((b) => b.status === "completed").length;
      const pendingJobs = bookings.filter((b) => b.status === "pending").length;
      const cancelledJobs = bookings.filter((b) => b.status === "cancelled").length;
      const activeJobs = bookings.filter((b) => b.status === "accepted" || b.status === "in_progress").length;

      const completedWithCost = bookings.filter(
        (b) => b.status === "completed" && (b.final_cost ?? b.estimated_cost) != null,
      );
      const averageRepairCost = completedWithCost.length > 0
        ? completedWithCost.reduce((s, b) => s + (b.final_cost ?? b.estimated_cost ?? 0), 0) / completedWithCost.length
        : 0;

      const techs = techRes.data ?? [];
      const customers = custRes.data ?? [];
      const avgRating = techs.length > 0
        ? techs.reduce((s, t) => s + (t.rating ?? 0), 0) / techs.length
        : 0;

      // Top categories
      const catCounts: Record<number, number> = {};
      bookings.forEach((b) => { catCounts[b.category_id] = (catCounts[b.category_id] ?? 0) + 1; });
      const { data: cats } = await supabase().from("service_categories").select("id, name");
      const catMap = new Map((cats ?? []).map((c) => [c.id, c.name]));
      const topCategories = Object.entries(catCounts)
        .map(([id, count]) => ({ name: catMap.get(Number(id)) ?? "Unknown", count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      return {
        totalRequests,
        completedJobs,
        pendingJobs,
        cancelledJobs,
        activeJobs,
        averageRepairCost: Math.round(averageRepairCost * 100) / 100,
        technicianCount: techs.length,
        customerCount: customers.length,
        averageTechnicianRating: Math.round(avgRating * 10) / 10,
        topCategories,
      };
    },
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

// ============================================================================
// AI hooks — call Vercel serverless functions (Groq)
// ============================================================================

export function useAnalyzeIssue<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      IssueAnalysisResult,
      TError,
      { data: IssueAnalysisInput },
      TContext
    >;
  },
): UseMutationResult<IssueAnalysisResult, TError, { data: IssueAnalysisInput }, TContext> {
  return useMutation({
    mutationKey: ["analyzeIssue"],
    mutationFn: async ({ data: input }) => {
      const res = await fetch("/api/ai/analyze-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "AI analysis failed" }));
        throw new Error(err.error || "AI analysis failed");
      }
      return res.json();
    },
    ...options?.mutation,
  });
}

export function useGetTechnicianBrief<
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      TechnicianBriefResult,
      TError,
      { data: TechnicianBriefInput },
      TContext
    >;
  },
): UseMutationResult<TechnicianBriefResult, TError, { data: TechnicianBriefInput }, TContext> {
  return useMutation({
    mutationKey: ["getTechnicianBrief"],
    mutationFn: async ({ data: input }) => {
      const res = await fetch("/api/ai/technician-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "AI brief generation failed" }));
        throw new Error(err.error || "AI brief generation failed");
      }
      return res.json();
    },
    ...options?.mutation,
  });
}

// ============================================================================
// Health check (simple Supabase connectivity check)
// ============================================================================

export function useHealthCheck<
  TData = { status: string },
  TError = unknown,
>(
  options?: { query?: UseQueryOptions<{ status: string }, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = ["/api/healthz"] as const;
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { error } = await supabase().from("profiles").select("id").limit(1);
      if (error) throw new Error("Database connection failed");
      return { status: "ok" };
    },
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}

// ============================================================================
// SSE stub (replaced by Supabase Realtime in use-realtime-events.ts)
// ============================================================================

export function useSubscribeToEvents<
  TData = string,
  TError = unknown,
>(
  _params?: any,
  options?: { query?: UseQueryOptions<string, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = ["/api/events"] as const;
  return useQuery({
    queryKey,
    queryFn: async () => "connected",
    refetchInterval: false,
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
}
