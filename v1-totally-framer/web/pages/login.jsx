import { Button, Card, Center, Stack, Text, Title } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { signInWithGoogle, useMustNotBeSignedIn } from "@web/modules/firebase"
import { useRouter } from "next/router"
import { FcGoogle } from "react-icons/fc"
import { useMutation } from "react-query"
import siteInfo from "@web/site-info.json"


export default function LoginPage() {

    const router = useRouter()

    const signInMut = useMutation({
        mutationFn: signInWithGoogle,
        onError: err => {
            notifications.show({
                title: "There was a problem signing in.",
                message: err.message?.replace("Firebase: ", ""),
                color: "red",
            })
        },
        onSuccess: () => {
            router.push(siteInfo.sendLoggedInUsersTo)
        },
    })

    useMustNotBeSignedIn(!signInMut.isLoading && !signInMut.isSuccess && siteInfo.sendLoggedInUsersTo)

    return (
        <Center className="h-screen w-screen">
            <Card withBorder className="rounded-xl shadow-lg p-10 mb-10">
                <Stack>
                    <Title
                        order={1}
                        className="text-2xl font-bold text-center"
                    >
                        Welcome to <span className="text-primary-600">{siteInfo.name}</span>
                    </Title>

                    <Button
                        variant="white" color="dark" leftIcon={<FcGoogle />} size="lg"
                        className="hover:bg-gray-100 rounded-full"
                        onClick={signInMut.mutate}
                        loading={signInMut.isLoading}
                    >
                        Sign In with Google
                    </Button>

                    <Text className="text-gray text-sm text-center">
                        Email sign in coming soon!
                    </Text>
                </Stack>
            </Card>
        </Center>
    )
}
