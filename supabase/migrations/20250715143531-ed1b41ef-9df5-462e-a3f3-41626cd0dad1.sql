-- Remove authentication requirements and revert to simple policies

-- Drop existing auth-based policies
DROP POLICY IF EXISTS "Users can view rooms they created or joined" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Room owners can update their rooms" ON public.rooms;
DROP POLICY IF EXISTS "Room owners can delete their rooms" ON public.rooms;

DROP POLICY IF EXISTS "Users can view players in rooms they have access to" ON public.players;
DROP POLICY IF EXISTS "Authenticated users can join rooms" ON public.players;
DROP POLICY IF EXISTS "Players can update their own player record" ON public.players;

DROP POLICY IF EXISTS "Users can view game requests for rooms they have access to" ON public.game_requests;
DROP POLICY IF EXISTS "Players can create game requests" ON public.game_requests;

DROP POLICY IF EXISTS "Users can view votes for rooms they have access to" ON public.game_votes;
DROP POLICY IF EXISTS "Players can vote" ON public.game_votes;

DROP POLICY IF EXISTS "Users can view forms responses for rooms they have access to" ON public.forms_responses;
DROP POLICY IF EXISTS "Players can submit forms responses" ON public.forms_responses;

DROP POLICY IF EXISTS "Users can view paranoia rounds for rooms they have access to" ON public.paranoia_rounds;
DROP POLICY IF EXISTS "Players can create paranoia rounds" ON public.paranoia_rounds;

-- Create simple "allow all" policies
CREATE POLICY "Allow all operations on rooms" ON public.rooms FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON public.players FOR ALL USING (true);
CREATE POLICY "Allow all operations on game requests" ON public.game_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations on votes" ON public.game_votes FOR ALL USING (true);
CREATE POLICY "Allow all operations on forms responses" ON public.forms_responses FOR ALL USING (true);
CREATE POLICY "Allow all operations on paranoia rounds" ON public.paranoia_rounds FOR ALL USING (true);

-- Drop profiles table and related objects
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles;

-- Remove user_id column from rooms table
ALTER TABLE public.rooms DROP COLUMN IF EXISTS user_id;