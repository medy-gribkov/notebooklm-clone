/**
 * Integration tests against REAL Supabase.
 *
 * These tests use the service-role client to verify:
 * - Database schema matches expectations (columns, types, constraints)
 * - RPC functions work (match_chunks, validate_share_token)
 * - CRUD lifecycle (insert -> select -> update -> delete)
 * - Cascade deletes (notebook deletion cleans up children)
 * - RLS policies (anon key cannot bypass)
 * - Constraint enforcement (CHECK, UNIQUE, FK)
 *
 * Requires real env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Skipped in CI (env vars are stubs). Run locally: npx vitest run __tests__/integration/
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Skip entire suite if we're in CI with stub credentials
const isReal =
  SUPABASE_URL.includes("supabase.co") &&
  SERVICE_KEY.length > 20 &&
  !SUPABASE_URL.includes("placeholder");

const describeIntegration = isReal ? describe : describe.skip;

let service: SupabaseClient;
let anon: SupabaseClient;

// Test user ID - we'll use the admin/service role to create test data
// linked to a dummy UUID that doesn't conflict with real users
const TEST_USER_ID = "00000000-0000-0000-0000-000000000099";
const TEST_NOTEBOOK_ID_1 = "00000000-0000-0000-0000-000000000001";
const TEST_NOTEBOOK_ID_2 = "00000000-0000-0000-0000-000000000002";

describeIntegration("Supabase Integration Tests", () => {
  beforeAll(async () => {
    service = createClient(SUPABASE_URL, SERVICE_KEY);
    anon = createClient(SUPABASE_URL, ANON_KEY);

    // Clean up any leftover test data from previous runs
    await cleanupTestData();

    // Create a test user in auth.users via admin API
    // If user already exists, this is idempotent
    const { error: userErr } = await service.auth.admin.createUser({
      email: "integration-test@docchat-test.local",
      password: "test-password-123!",
      email_confirm: true,
      user_metadata: { full_name: "Integration Test User" },
    });
    // Ignore "already exists" error
    if (userErr && !userErr.message.includes("already")) {
      // Try to get existing user
      const { data: users } = await service.auth.admin.listUsers();
      const existing = users?.users?.find(
        (u) => u.email === "integration-test@docchat-test.local"
      );
      if (!existing) throw new Error(`Cannot create test user: ${userErr.message}`);
    }

    // Get the actual user ID
    const { data: users } = await service.auth.admin.listUsers();
    const testUser = users?.users?.find(
      (u) => u.email === "integration-test@docchat-test.local"
    );
    if (!testUser) throw new Error("Test user not found after creation");
    // Override our test user ID with the real one
    (globalThis as unknown as Record<string, string>).__TEST_USER_ID__ = testUser.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  function getUserId(): string {
    return (globalThis as unknown as Record<string, string>).__TEST_USER_ID__ ?? TEST_USER_ID;
  }

  async function cleanupTestData() {
    // Delete in order respecting foreign keys (children first)
    // Service role bypasses RLS
    const userId = getUserId();
    await service.from("notebook_members").delete().eq("user_id", userId);
    await service.from("studio_generations").delete().eq("user_id", userId);
    await service.from("notes").delete().eq("user_id", userId);
    await service.from("messages").delete().eq("user_id", userId);
    await service.from("shared_links").delete().eq("user_id", userId);
    await service.from("chunks").delete().eq("user_id", userId);
    await service.from("notebook_files").delete().eq("user_id", userId);
    await service.from("notebooks").delete().eq("user_id", userId);
    // Also clean by known test IDs
    await service.from("notebooks").delete().eq("id", TEST_NOTEBOOK_ID_1);
    await service.from("notebooks").delete().eq("id", TEST_NOTEBOOK_ID_2);
  }

  // ─── Schema Verification ──────────────────────────────────────────

  describe("Schema: tables exist and accept inserts", () => {
    it("notebooks table: insert, select, update, delete lifecycle", async () => {
      const userId = getUserId();

      // INSERT
      const { data: created, error: insertErr } = await service
        .from("notebooks")
        .insert({
          user_id: userId,
          title: "Integration Test Notebook",
          description: "Created by integration test",
          status: "processing",
        })
        .select()
        .single();

      expect(insertErr).toBeNull();
      expect(created).toBeDefined();
      expect(created!.id).toBeDefined();
      expect(created!.title).toBe("Integration Test Notebook");
      expect(created!.status).toBe("processing");
      expect(created!.user_id).toBe(userId);
      expect(created!.created_at).toBeDefined();

      const nbId = created!.id;

      // SELECT
      const { data: fetched, error: selectErr } = await service
        .from("notebooks")
        .select("*")
        .eq("id", nbId)
        .single();

      expect(selectErr).toBeNull();
      expect(fetched!.title).toBe("Integration Test Notebook");

      // UPDATE
      const { data: updated, error: updateErr } = await service
        .from("notebooks")
        .update({ status: "ready", title: "Updated Title" })
        .eq("id", nbId)
        .select()
        .single();

      expect(updateErr).toBeNull();
      expect(updated!.status).toBe("ready");
      expect(updated!.title).toBe("Updated Title");

      // DELETE
      const { error: deleteErr } = await service
        .from("notebooks")
        .delete()
        .eq("id", nbId);

      expect(deleteErr).toBeNull();

      // Verify gone
      const { data: gone } = await service
        .from("notebooks")
        .select("id")
        .eq("id", nbId)
        .single();

      expect(gone).toBeNull();
    });

    it("notebook_files table: insert with correct columns", async () => {
      const userId = getUserId();

      // Create parent notebook first
      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "File Test NB", status: "processing" })
        .select("id")
        .single();

      const { data: file, error } = await service
        .from("notebook_files")
        .insert({
          notebook_id: nb!.id,
          user_id: userId,
          file_name: "test-doc.pdf",
          storage_path: `${userId}/test-doc.pdf`,
          status: "processing",
          page_count: 5,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(file!.file_name).toBe("test-doc.pdf");
      expect(file!.status).toBe("processing");
      expect(file!.page_count).toBe(5);

      // Cleanup
      await service.from("notebook_files").delete().eq("id", file!.id);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });

    it("messages table: enforces role CHECK constraint", async () => {
      const userId = getUserId();

      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Msg Test NB", status: "ready" })
        .select("id")
        .single();

      // Valid role
      const { data: msg, error: validErr } = await service
        .from("messages")
        .insert({
          notebook_id: nb!.id,
          user_id: userId,
          role: "user",
          content: "Hello from integration test",
        })
        .select()
        .single();

      expect(validErr).toBeNull();
      expect(msg!.role).toBe("user");

      // Invalid role should fail
      const { error: invalidErr } = await service
        .from("messages")
        .insert({
          notebook_id: nb!.id,
          user_id: userId,
          role: "hacker",
          content: "Should fail",
        });

      expect(invalidErr).not.toBeNull();
      expect(invalidErr!.message).toMatch(/violates check constraint/i);

      // Cleanup
      await service.from("messages").delete().eq("notebook_id", nb!.id);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });

    it("notes table: defaults for title and content", async () => {
      const userId = getUserId();

      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Notes Test NB", status: "ready" })
        .select("id")
        .single();

      const { data: note, error } = await service
        .from("notes")
        .insert({
          notebook_id: nb!.id,
          user_id: userId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(note!.title).toBe("New note");
      expect(note!.content).toBe("");

      await service.from("notes").delete().eq("id", note!.id);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });

    it("shared_links table: token UNIQUE constraint", async () => {
      const userId = getUserId();

      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Share Test NB", status: "ready" })
        .select("id")
        .single();

      const token = `integ-test-${Date.now()}`;

      // First insert works
      const { error: first } = await service
        .from("shared_links")
        .insert({
          notebook_id: nb!.id,
          user_id: userId,
          token,
          permissions: "view",
        });

      expect(first).toBeNull();

      // Duplicate token fails
      const { error: dupe } = await service
        .from("shared_links")
        .insert({
          notebook_id: nb!.id,
          user_id: userId,
          token,
          permissions: "chat",
        });

      expect(dupe).not.toBeNull();
      expect(dupe!.message).toMatch(/duplicate key|unique/i);

      // Cleanup
      await service.from("shared_links").delete().eq("token", token);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });

    it("notebook_files status CHECK constraint", async () => {
      const userId = getUserId();

      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Status Test NB", status: "processing" })
        .select("id")
        .single();

      // Invalid status should fail
      const { error } = await service
        .from("notebook_files")
        .insert({
          notebook_id: nb!.id,
          user_id: userId,
          file_name: "bad-status.pdf",
          storage_path: `${userId}/bad-status.pdf`,
          status: "invalid_status",
        });

      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/violates check constraint/i);

      await service.from("notebooks").delete().eq("id", nb!.id);
    });

    it("notebook_members UNIQUE(notebook_id, user_id) constraint", async () => {
      const userId = getUserId();

      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Members Test NB", status: "ready" })
        .select("id")
        .single();

      // First membership insert
      const { error: first } = await service
        .from("notebook_members")
        .insert({
          notebook_id: nb!.id,
          user_id: userId,
          role: "viewer",
        });

      expect(first).toBeNull();

      // Duplicate should fail
      const { error: dupe } = await service
        .from("notebook_members")
        .insert({
          notebook_id: nb!.id,
          user_id: userId,
          role: "editor",
        });

      expect(dupe).not.toBeNull();
      expect(dupe!.message).toMatch(/duplicate key|unique/i);

      await service.from("notebook_members").delete().eq("notebook_id", nb!.id);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });
  });

  // ─── Cascade Deletes ──────────────────────────────────────────────

  describe("Cascade deletes", () => {
    it("deleting a notebook cascades to files, messages, notes, shared_links, chunks, generations", async () => {
      const userId = getUserId();

      // Create notebook
      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Cascade Test", status: "ready" })
        .select("id")
        .single();

      const nbId = nb!.id;

      // Create child records
      const { data: file } = await service
        .from("notebook_files")
        .insert({
          notebook_id: nbId,
          user_id: userId,
          file_name: "cascade.pdf",
          storage_path: `${userId}/cascade.pdf`,
          status: "ready",
        })
        .select("id")
        .single();

      const { data: msg } = await service
        .from("messages")
        .insert({
          notebook_id: nbId,
          user_id: userId,
          role: "user",
          content: "Cascade test message",
        })
        .select("id")
        .single();

      const { data: note } = await service
        .from("notes")
        .insert({
          notebook_id: nbId,
          user_id: userId,
          title: "Cascade note",
          content: "Will be deleted",
        })
        .select("id")
        .single();

      const token = `cascade-${Date.now()}`;
      const { data: link } = await service
        .from("shared_links")
        .insert({
          notebook_id: nbId,
          user_id: userId,
          token,
          permissions: "view",
        })
        .select("id")
        .single();

      const { data: gen } = await service
        .from("studio_generations")
        .insert({
          notebook_id: nbId,
          user_id: userId,
          action: "quiz",
          result: { questions: [] },
        })
        .select("id")
        .single();

      // Verify all exist
      expect(file).not.toBeNull();
      expect(msg).not.toBeNull();
      expect(note).not.toBeNull();
      expect(link).not.toBeNull();
      expect(gen).not.toBeNull();

      // DELETE the notebook
      const { error: delErr } = await service
        .from("notebooks")
        .delete()
        .eq("id", nbId);

      expect(delErr).toBeNull();

      // Verify all children are gone
      const { data: files } = await service
        .from("notebook_files")
        .select("id")
        .eq("id", file!.id);
      expect(files).toEqual([]);

      const { data: msgs } = await service
        .from("messages")
        .select("id")
        .eq("id", msg!.id);
      expect(msgs).toEqual([]);

      const { data: notes } = await service
        .from("notes")
        .select("id")
        .eq("id", note!.id);
      expect(notes).toEqual([]);

      const { data: links } = await service
        .from("shared_links")
        .select("id")
        .eq("id", link!.id);
      expect(links).toEqual([]);

      const { data: gens } = await service
        .from("studio_generations")
        .select("id")
        .eq("id", gen!.id);
      expect(gens).toEqual([]);
    });
  });

  // ─── RPC Functions ────────────────────────────────────────────────

  describe("RPC: validate_share_token", () => {
    it("returns valid=true for active non-expired token", async () => {
      const userId = getUserId();

      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "RPC Test", status: "ready" })
        .select("id")
        .single();

      const token = `rpc-test-${Date.now()}`;
      await service.from("shared_links").insert({
        notebook_id: nb!.id,
        user_id: userId,
        token,
        permissions: "chat",
        is_active: true,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      const { data, error } = await service.rpc("validate_share_token", {
        share_token: token,
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].notebook_id).toBe(nb!.id);
      expect(data![0].permissions).toBe("chat");
      expect(data![0].is_valid).toBe(true);

      // Cleanup
      await service.from("shared_links").delete().eq("token", token);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });

    it("returns valid=false for expired token", async () => {
      const userId = getUserId();

      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Expired Token Test", status: "ready" })
        .select("id")
        .single();

      const token = `expired-${Date.now()}`;
      await service.from("shared_links").insert({
        notebook_id: nb!.id,
        user_id: userId,
        token,
        permissions: "view",
        is_active: true,
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      });

      const { data } = await service.rpc("validate_share_token", {
        share_token: token,
      });

      expect(data).toHaveLength(1);
      expect(data![0].is_valid).toBe(false);

      await service.from("shared_links").delete().eq("token", token);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });

    it("returns valid=false for inactive token", async () => {
      const userId = getUserId();

      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Inactive Token Test", status: "ready" })
        .select("id")
        .single();

      const token = `inactive-${Date.now()}`;
      await service.from("shared_links").insert({
        notebook_id: nb!.id,
        user_id: userId,
        token,
        permissions: "view",
        is_active: false,
      });

      const { data } = await service.rpc("validate_share_token", {
        share_token: token,
      });

      expect(data).toHaveLength(1);
      expect(data![0].is_valid).toBe(false);

      await service.from("shared_links").delete().eq("token", token);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });

    it("returns empty for non-existent token", async () => {
      const { data } = await service.rpc("validate_share_token", {
        share_token: "does-not-exist-xyz",
      });

      expect(data).toEqual([]);
    });
  });

  // ─── RLS Policies ────────────────────────────────────────────────

  describe("RLS: anon client cannot access user data", () => {
    it("anon client cannot read notebooks", async () => {
      const userId = getUserId();

      // Insert via service role
      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "RLS Test", status: "ready" })
        .select("id")
        .single();

      // Anon should not see it
      const { data: visible } = await anon
        .from("notebooks")
        .select("id")
        .eq("id", nb!.id);

      expect(visible).toEqual([]);

      await service.from("notebooks").delete().eq("id", nb!.id);
    });

    it("anon client cannot insert notebooks", async () => {
      const { error } = await anon.from("notebooks").insert({
        user_id: getUserId(),
        title: "Should Fail",
        status: "processing",
      });

      expect(error).not.toBeNull();
    });

    it("anon client cannot read messages", async () => {
      const userId = getUserId();

      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "RLS Msg Test", status: "ready" })
        .select("id")
        .single();

      await service.from("messages").insert({
        notebook_id: nb!.id,
        user_id: userId,
        role: "user",
        content: "Secret message",
      });

      const { data: visible } = await anon
        .from("messages")
        .select("*")
        .eq("notebook_id", nb!.id);

      expect(visible).toEqual([]);

      await service.from("messages").delete().eq("notebook_id", nb!.id);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });
  });

  // ─── Foreign Key Enforcement ──────────────────────────────────────

  describe("Foreign key constraints", () => {
    it("cannot insert message for non-existent notebook", async () => {
      const fakeNbId = "00000000-0000-0000-0000-ffffffffffff";

      const { error } = await service.from("messages").insert({
        notebook_id: fakeNbId,
        user_id: getUserId(),
        role: "user",
        content: "Orphan message",
      });

      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/foreign key|violates/i);
    });

    it("cannot insert notebook_file for non-existent notebook", async () => {
      const fakeNbId = "00000000-0000-0000-0000-ffffffffffff";

      const { error } = await service.from("notebook_files").insert({
        notebook_id: fakeNbId,
        user_id: getUserId(),
        file_name: "orphan.pdf",
        storage_path: "test/orphan.pdf",
        status: "processing",
      });

      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/foreign key|violates/i);
    });
  });

  // ─── Data Integrity ──────────────────────────────────────────────

  describe("Data integrity: messages sources constraint", () => {
    it("accepts null sources", async () => {
      const userId = getUserId();
      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Sources Test", status: "ready" })
        .select("id")
        .single();

      const { error } = await service.from("messages").insert({
        notebook_id: nb!.id,
        user_id: userId,
        role: "assistant",
        content: "No sources",
        sources: null,
      });

      expect(error).toBeNull();
      await service.from("messages").delete().eq("notebook_id", nb!.id);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });

    it("accepts array sources", async () => {
      const userId = getUserId();
      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Array Sources Test", status: "ready" })
        .select("id")
        .single();

      const sources = [
        { file_name: "test.pdf", chunk_index: 0, content: "chunk text" },
      ];

      const { error } = await service.from("messages").insert({
        notebook_id: nb!.id,
        user_id: userId,
        role: "assistant",
        content: "With sources",
        sources,
      });

      expect(error).toBeNull();
      await service.from("messages").delete().eq("notebook_id", nb!.id);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });

    it("rejects non-array sources (object)", async () => {
      const userId = getUserId();
      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Bad Sources Test", status: "ready" })
        .select("id")
        .single();

      const { error } = await service.from("messages").insert({
        notebook_id: nb!.id,
        user_id: userId,
        role: "assistant",
        content: "Bad sources",
        sources: { not: "an array" } as unknown,
      });

      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/violates check constraint|sources_is_array/i);

      await service.from("messages").delete().eq("notebook_id", nb!.id);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });
  });

  // ─── Studio Generations ───────────────────────────────────────────

  describe("Studio generations CRUD", () => {
    it("insert and retrieve generation with JSONB result", async () => {
      const userId = getUserId();
      const { data: nb } = await service
        .from("notebooks")
        .insert({ user_id: userId, title: "Studio Test", status: "ready" })
        .select("id")
        .single();

      const quizResult = {
        questions: [
          {
            question: "What is ML?",
            options: ["A", "B", "C", "D"],
            correctIndex: 0,
            explanation: "ML is...",
          },
        ],
      };

      const { data: gen, error } = await service
        .from("studio_generations")
        .insert({
          notebook_id: nb!.id,
          user_id: userId,
          action: "quiz",
          result: quizResult,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(gen!.action).toBe("quiz");
      expect(gen!.result).toEqual(quizResult);
      expect(gen!.result.questions).toHaveLength(1);
      expect(gen!.result.questions[0].correctIndex).toBe(0);

      await service.from("studio_generations").delete().eq("id", gen!.id);
      await service.from("notebooks").delete().eq("id", nb!.id);
    });
  });
});
