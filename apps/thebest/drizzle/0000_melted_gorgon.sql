CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"slot_id" uuid,
	"guest_name" text NOT NULL,
	"guest_email" text NOT NULL,
	"guest_phone" text,
	"guest_language" text,
	"participants" integer NOT NULL,
	"participants_by_category_json" jsonb,
	"selected_addon_ids_json" jsonb,
	"price_breakdown_json" jsonb NOT NULL,
	"total_amount" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_intent_id" text,
	"booking_reference" text NOT NULL,
	"attendance_status" text DEFAULT 'not_arrived' NOT NULL,
	"special_requests" text,
	"cancelled_by" text,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_reference_unique" UNIQUE("booking_reference")
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"stripe_account_id" text,
	"stripe_onboarding_complete" boolean DEFAULT false NOT NULL,
	"avatar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guides_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"provider_id" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "oauth_accounts_provider_id_provider_user_id_pk" PRIMARY KEY("provider_id","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"schedule_rule_id" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"available_spots" integer NOT NULL,
	"booked_spots" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"notes" text,
	"is_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration" integer NOT NULL,
	"capacity" integer NOT NULL,
	"min_capacity" integer DEFAULT 1 NOT NULL,
	"max_capacity" integer NOT NULL,
	"languages" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"location" text,
	"categories" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"included_items" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"requirements" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"images" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"pricing_json" jsonb NOT NULL,
	"cancellation_policy_json" jsonb NOT NULL,
	"schedule_rules_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_guides_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_guides_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;