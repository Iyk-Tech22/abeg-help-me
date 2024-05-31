import type { ApiResponse, User } from "@/interfaces";
import { AuthenticatedUserLayout } from "@/layouts";
import { callApi } from "@/lib";
import { useCopyToClipboard } from "@/lib/hooks";
import { useSession } from "@/store";
import { ClipboardIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CustomDialog, OtpInputDisplay, Spinner } from "../common";
import { Button } from "../ui";

type AuthenticatorFirstStepProps = {
	setStep: React.Dispatch<React.SetStateAction<number>>;
	recoveryCode: React.MutableRefObject<string | null>;
};

const FirstStep = ({ setStep, recoveryCode }: AuthenticatorFirstStepProps) => {
	const [isQRCodeLoading, setIsQRCodeLoading] = useState(true);
	const [QRCodeError, setQRCodeError] = useState(false);
	const [otpLoading, setOtpLoading] = useState(false);
	const [data, setData] = useState<ApiResponse>();
	const [otp, setOtp] = useState("");
	const { copyToClipboard } = useCopyToClipboard();
	const { user } = useSession((state) => state);

	const apiCalled = useRef(false);

	// get qr code or secret
	useEffect(() => {
		const setup2fa = async () => {
			const { data: dataInfo, error } = await callApi<ApiResponse>(
				"/auth/2fa/setup",
				{
					twoFactorType: "APP",
				}
			);

			if (dataInfo) {
				setData(dataInfo);
				setIsQRCodeLoading(false);
				setQRCodeError(false);
			}
			if (error) {
				toast.error(error.status, {
					description: error.message,
				});
				setQRCodeError(true);
				setIsQRCodeLoading(false);
			}
		};

		if (!apiCalled.current) {
			void setup2fa();
			apiCalled.current = true;
		}
	}, [isQRCodeLoading]);

	const handleCopy = () => {
		copyToClipboard(data?.data?.secret as string);

		toast.success("Success", {
			description: "Key copied to clipboard",
		});
	};

	const handleOtpSubmit = async () => {
		setOtpLoading(true);

		const { data: dataInfo, error } = await callApi<ApiResponse>(
			"/auth/2fa/complete",
			{
				token: otp,
				twoFactorType: "APP",
			}
		);

		if (dataInfo) {
			localStorage.setItem(
				`skip-2FA-${(user as User)?._id}`,
				JSON.stringify(true)
			);
			setStep(2);
			recoveryCode.current = dataInfo.data?.recoveryCode as string;
			setOtpLoading(false);
		}
		if (error) {
			toast.error(error.status, {
				description: error.message,
				duration: 2000,
			});
			setOtpLoading(false);
			setOtp("");
		}
	};

	return (
		<>
			<AuthenticatedUserLayout
				footer={
					<div className="mx-auto flex w-full justify-end">
						<CustomDialog
							trigger={
								<Button
									variant="primary"
									className="w-fit !px-6"
									size="sm"
									disabled={data === undefined || QRCodeError}
								>
									NEXT
								</Button>
							}
						>
							<OtpInputDisplay
								otp={otp}
								setOtp={setOtp}
								topSection={
									<p>
										Enter the 6-digit code generated by your authentication app.
									</p>
								}
								bottomSection={
									<div className="mt-12 flex w-full lg:mt-20">
										<Button
											className={`${
												otp === "" && "cursor-not-allowed"
											} block w-full rounded-md bg-abeg-primary py-4 font-semibold text-white`}
											fullWidth
											type="submit"
											onClick={() => void handleOtpSubmit()}
											loading={otpLoading}
										>
											Complete
										</Button>
									</div>
								}
							/>
						</CustomDialog>
					</div>
				}
			>
				<div className="mx-auto mt-8 w-full lg:mt-10">
					<h1 className="text-lg font-semibold md:text-2xl">
						Setting up your two-factor authentication
					</h1>
					<ol className="mt-6 flex list-inside list-none flex-col gap-3">
						<li className="flex flex-col gap-2">
							<h2 className="font-semibold">
								1. Download an authentication app
							</h2>
							<p>
								We recommend downloading Google Authenticator app if you
								don&apos;t have one installed yet.
							</p>
						</li>
						<li className="flex flex-col gap-2">
							<h2 className="font-semibold">
								2. Scan this QR code or copy the key.
							</h2>
							<p>
								Scan this QR code in the authentication app or copy key and
								paste it in the authentication app to generate your verification
								code
							</p>
							<div className="flex min-h-28 items-center">
								{isQRCodeLoading ? (
									<Spinner />
								) : QRCodeError ? (
									<Button
										className="mx-auto"
										variant="secondary"
										onClick={() => setIsQRCodeLoading(true)}
									>
										Retry
									</Button>
								) : (
									<div className="flex w-full flex-col items-center justify-around gap-y-2 lg:flex-row">
										<div className="relative">
											<Image
												src={data?.data?.qrCode as string}
												height={250}
												width={250}
												alt=""
											/>
										</div>
										<div className="flex items-center justify-center gap-2">
											<span className="w-10 border-b-2" />
											<p>or</p>
											<span className="w-10 border-b-2" />
										</div>
										<div className="flex flex-col items-center">
											<span className="text-center font-semibold">
												{data?.data?.secret as string}
											</span>
											<button
												type="button"
												className="mt-2 flex items-center justify-center font-semibold text-abeg-primary"
												onClick={handleCopy}
											>
												<ClipboardIcon />
												<span>Copy Key</span>
											</button>
										</div>
									</div>
								)}
							</div>
						</li>
						<li className="flex flex-col gap-4">
							<h2 className="font-semibold">3. Copy and enter 6-digit code</h2>
							<p>
								After the QR code has been scanned or the key has been entered,
								your authentication app will generate a 6-digit code. Copy the
								code and click on the Next button to enter it.
							</p>
						</li>
					</ol>
				</div>
			</AuthenticatedUserLayout>
		</>
	);
};

export default FirstStep;