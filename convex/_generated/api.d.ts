/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ResetOTPPasswordReset from "../ResetOTPPasswordReset.js";
import type * as actions_admin_createAdminWithAuth from "../actions/admin/createAdminWithAuth.js";
import type * as actions_auth_createUser from "../actions/auth/createUser.js";
import type * as auth from "../auth.js";
import type * as compliance from "../compliance.js";
import type * as crons from "../crons.js";
import type * as emailVerification from "../emailVerification.js";
import type * as flows_landlordInvitation from "../flows/landlordInvitation.js";
import type * as flows_landlordVerification from "../flows/landlordVerification.js";
import type * as flows_tenantInitiatedRequest from "../flows/tenantInitiatedRequest.js";
import type * as flows_tenantInviteAcceptance from "../flows/tenantInviteAcceptance.js";
import type * as http from "../http.js";
import type * as migrations_updateReviews from "../migrations/updateReviews.js";
import type * as migrations_updateTenancies from "../migrations/updateTenancies.js";
import type * as mutations_admin_verifyLandlord from "../mutations/admin/verifyLandlord.js";
import type * as mutations_users_createUser from "../mutations/users/createUser.js";
import type * as mutations_users_deleteUserDocument from "../mutations/users/deleteUserDocument.js";
import type * as myFunctions from "../myFunctions.js";
import type * as passwordReset_PasswordResetEmail from "../passwordReset/PasswordResetEmail.js";
import type * as payments from "../payments.js";
import type * as profile from "../profile.js";
import type * as properties from "../properties.js";
import type * as queries_admin_getAllLandlords from "../queries/admin/getAllLandlords.js";
import type * as queries_admin_getLandlordDocumentUrls from "../queries/admin/getLandlordDocumentUrls.js";
import type * as queries_admin_getLandlordDocuments from "../queries/admin/getLandlordDocuments.js";
import type * as queries_admin_isAdmin from "../queries/admin/isAdmin.js";
import type * as queries_users_getUserDocumentUrls from "../queries/users/getUserDocumentUrls.js";
import type * as reviews from "../reviews.js";
import type * as services_disclaimers from "../services/disclaimers.js";
import type * as services_ipDetection from "../services/ipDetection.js";
import type * as services_verification from "../services/verification.js";
import type * as shareableLinks from "../shareableLinks.js";
import type * as tenancy from "../tenancy.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ResetOTPPasswordReset: typeof ResetOTPPasswordReset;
  "actions/admin/createAdminWithAuth": typeof actions_admin_createAdminWithAuth;
  "actions/auth/createUser": typeof actions_auth_createUser;
  auth: typeof auth;
  compliance: typeof compliance;
  crons: typeof crons;
  emailVerification: typeof emailVerification;
  "flows/landlordInvitation": typeof flows_landlordInvitation;
  "flows/landlordVerification": typeof flows_landlordVerification;
  "flows/tenantInitiatedRequest": typeof flows_tenantInitiatedRequest;
  "flows/tenantInviteAcceptance": typeof flows_tenantInviteAcceptance;
  http: typeof http;
  "migrations/updateReviews": typeof migrations_updateReviews;
  "migrations/updateTenancies": typeof migrations_updateTenancies;
  "mutations/admin/verifyLandlord": typeof mutations_admin_verifyLandlord;
  "mutations/users/createUser": typeof mutations_users_createUser;
  "mutations/users/deleteUserDocument": typeof mutations_users_deleteUserDocument;
  myFunctions: typeof myFunctions;
  "passwordReset/PasswordResetEmail": typeof passwordReset_PasswordResetEmail;
  payments: typeof payments;
  profile: typeof profile;
  properties: typeof properties;
  "queries/admin/getAllLandlords": typeof queries_admin_getAllLandlords;
  "queries/admin/getLandlordDocumentUrls": typeof queries_admin_getLandlordDocumentUrls;
  "queries/admin/getLandlordDocuments": typeof queries_admin_getLandlordDocuments;
  "queries/admin/isAdmin": typeof queries_admin_isAdmin;
  "queries/users/getUserDocumentUrls": typeof queries_users_getUserDocumentUrls;
  reviews: typeof reviews;
  "services/disclaimers": typeof services_disclaimers;
  "services/ipDetection": typeof services_ipDetection;
  "services/verification": typeof services_verification;
  shareableLinks: typeof shareableLinks;
  tenancy: typeof tenancy;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
