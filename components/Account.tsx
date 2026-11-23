"use client";

import { UserButton, useUser } from "@clerk/nextjs";

export default function Account() {
  const { user } = useUser();
  return (
    <div className="set-row">
      <UserButton />
      <div className="grow">
        <div className="t">{user?.fullName || user?.primaryEmailAddress?.emailAddress || "Tu cuenta"}</div>
        {user?.fullName && <div className="s">{user.primaryEmailAddress?.emailAddress}</div>}
      </div>
    </div>
  );
}
