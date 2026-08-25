import { z } from "zod";
import { DurableAssetLifecycleSchema, DurableAssetTypeSchema, EvidenceReferenceSchema, IsoDateTimeSchema, SemverSchema, Sha256Schema, SlugSchema } from "./common.v1.js";
const EventBaseSchema=z.object({schema:z.literal("PromotionEvent/v1"),eventId:z.string().uuid(),occurredAt:IsoDateTimeSchema,actorId:z.string().min(1)}).strict();
const RegistryTestTypeSchema=z.enum(["POSITIVE_TRIGGER","NEGATIVE_TRIGGER","AMBIGUOUS_TRIGGER","OUTPUT_CONTRACT","FAILURE_PATH","SECURITY"]);
const AuthorityPromotionFields={authorityRef:z.string().min(1).max(512),assetId:SlugSchema,patternId:SlugSchema,assetType:DurableAssetTypeSchema,version:SemverSchema,canonicalPath:z.string().min(1),description:z.string().min(1),semanticFingerprint:z.string().min(1),evidenceRefs:z.array(EvidenceReferenceSchema),principalId:SlugSchema.optional(),authorityPolicyRevision:z.number().int().positive().optional(),authorityPolicyHash:Sha256Schema.optional()};
export const PromotionEventV1Schema=z.discriminatedUnion("type",[
EventBaseSchema.extend({type:z.literal("PATTERN_OBSERVED"),patternId:SlugSchema,semanticFingerprint:z.string().min(1),evidence:EvidenceReferenceSchema,reusable:z.boolean(),temporaryContext:z.boolean(),proposedAssetType:DurableAssetTypeSchema.nullable()}),
EventBaseSchema.extend({type:z.literal("PROMOTION_CLASSIFIED"),patternId:SlugSchema,proposedAssetType:DurableAssetTypeSchema}),
EventBaseSchema.extend({type:z.literal("EXISTING_ASSET_MATCHED"),patternId:SlugSchema,assetId:SlugSchema,similarity:z.number().min(0).max(1)}),
EventBaseSchema.extend({type:z.literal("ASSET_PROMOTED"),assetId:SlugSchema,patternId:SlugSchema,assetType:DurableAssetTypeSchema,version:SemverSchema,canonicalPath:z.string().min(1),description:z.string().min(1)}),
EventBaseSchema.extend({type:z.literal("SECURITY_PROMOTION_AUTHORIZED"),...AuthorityPromotionFields}),EventBaseSchema.extend({type:z.literal("COMPLIANCE_PROMOTION_AUTHORIZED"),...AuthorityPromotionFields}),EventBaseSchema.extend({type:z.literal("OPERATOR_PROMOTION_AUTHORIZED"),...AuthorityPromotionFields}),
EventBaseSchema.extend({type:z.literal("ASSET_MERGED"),patternId:SlugSchema,targetAssetId:SlugSchema}),
EventBaseSchema.extend({type:z.literal("ASSET_VERSION_SUPERSEDED"),previousAssetId:SlugSchema,assetId:SlugSchema,version:SemverSchema,canonicalPath:z.string().min(1),description:z.string().min(1),semanticFingerprint:z.string().min(1),evidenceRefs:z.array(EvidenceReferenceSchema)}),
EventBaseSchema.extend({type:z.literal("ASSET_TEST_RECORDED"),assetId:SlugSchema,testId:SlugSchema,testType:RegistryTestTypeSchema,status:z.enum(["PENDING","PASSED","FAILED"])}),
EventBaseSchema.extend({type:z.literal("LIFECYCLE_TRANSITION_REQUESTED"),assetId:SlugSchema,to:DurableAssetLifecycleSchema})]);
export type PromotionEventV1=z.infer<typeof PromotionEventV1Schema>;
