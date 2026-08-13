-- Policies RLS sur storage.objects (buckets joueurs_photos et photos_import).
-- Capturées séparément de schema.sql : `supabase db dump --schema storage` inclut aussi
-- les tables internes de Supabase Storage (buckets, migrations...) qui ne sont pas à
-- notre charge et ne doivent pas être rejouées. Seules les policies applicables à nos
-- deux buckets sont conservées ici, à titre de documentation versionnée.

CREATE POLICY "Acces lecture authentifie" ON "storage"."objects" FOR SELECT TO "authenticated" USING (("bucket_id" = 'joueurs_photos'::"text"));

CREATE POLICY "Admin Delete Photo" ON "storage"."objects" FOR DELETE TO "authenticated" USING (("bucket_id" = 'joueurs_photos'::"text"));

CREATE POLICY "Admin Upload Photo" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK (("bucket_id" = 'joueurs_photos'::"text"));

CREATE POLICY "Give users authenticated access to folder 2dnyub_0" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'photos_import'::"text") AND (("storage"."foldername"("name"))[1] = 'private'::"text") AND ("auth"."role"() = 'authenticated'::"text")));

CREATE POLICY "Give users authenticated access to folder 2dnyub_1" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'photos_import'::"text") AND (("storage"."foldername"("name"))[1] = 'private'::"text") AND ("auth"."role"() = 'authenticated'::"text")));

CREATE POLICY "Give users authenticated access to folder 2dnyub_2" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'photos_import'::"text") AND (("storage"."foldername"("name"))[1] = 'private'::"text") AND ("auth"."role"() = 'authenticated'::"text")));
