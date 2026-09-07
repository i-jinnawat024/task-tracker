import Board from "@/components/Board";
import { requireUser } from "@/lib/auth";
import { getMembers, getMyLists, getTasks } from "@/lib/db/lists";
import { todayISO } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>;
}) {
  const user = await requireUser();
  const { list: requestedListId } = await searchParams;

  const lists = await getMyLists(user.id);
  // ?list=<id> ที่ไม่ได้อยู่ในลิสต์ของเรา → ตกกลับมาที่ลิสต์แรก ไม่ throw ให้ผู้ใช้เจอ error
  const activeList = lists.find((l) => l.id === requestedListId) ?? lists[0];

  const [tasks, members] = await Promise.all([
    getTasks(activeList.id, user.id),
    getMembers(activeList.id, user.id),
  ]);

  return (
    <Board
      user={user}
      lists={lists}
      activeList={activeList}
      tasks={tasks}
      members={members}
      today={todayISO()}
    />
  );
}
