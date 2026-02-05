import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <SignUp
                appearance={{
                    elements: {
                        formButtonPrimary: "bg-[#0D9488] hover:bg-[#0D9488]/90",
                        footerActionLink: "text-[#0D9488] hover:text-[#0D9488]/80",
                    },
                }}
            />
        </div>
    );
}
