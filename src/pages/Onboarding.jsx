import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, ArrowRight, ArrowLeft, Briefcase, Building2, Loader2, AlertCircle } from "lucide-react";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    userType: "",
    firstName: "",
    lastName: "",
    cifNif: "",
    email: "",
    password: "",
    phone: "",
    activity: "",
    activityOther: "",
    address: "",
    paymentMethod: "stripe",
  });

  // Check for success/cancel from Stripe redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (success === 'true') {
      setCurrentStep(steps.length); // Show success screen
    } else if (canceled === 'true') {
      setError(t('subscription.onboarding.errors.paymentCanceled'));
    }
  }, []);

  // Los `value` de las opciones son lo que se envía al backend: van literales.
  const steps = [
    {
      question: t('subscription.onboarding.steps.userType'),
      field: "userType",
      type: "choice",
      options: [
        { value: "autonomo", label: t('subscription.onboarding.userType.freelancer'), icon: Briefcase },
        { value: "empresa", label: t('subscription.onboarding.userType.company'), icon: Building2 }
      ]
    },
    {
      question: formData.userType === "empresa" ? t('subscription.onboarding.steps.companyName') : t('subscription.onboarding.steps.firstName'),
      field: "firstName",
      type: "text",
      placeholder: formData.userType === "empresa" ? t('subscription.onboarding.placeholders.companyName') : t('subscription.onboarding.placeholders.firstName'),
      maxLength: 50
    },
    {
      question: t('subscription.onboarding.steps.lastName'),
      field: "lastName",
      type: "text",
      placeholder: t('subscription.onboarding.placeholders.lastName'),
      maxLength: 100,
      skipIfEmpresa: true
    },
    {
      question: formData.userType === "empresa" ? t('subscription.onboarding.steps.companyCif') : t('subscription.onboarding.steps.nif'),
      field: "cifNif",
      type: "nif",
      placeholder: formData.userType === "empresa" ? t('subscription.onboarding.placeholders.cif') : t('subscription.onboarding.placeholders.nif'),
      maxLength: 9
    },
    {
      question: t('subscription.onboarding.steps.email'),
      field: "email",
      type: "email",
      placeholder: t('auth.email_placeholder'),
      maxLength: 100
    },
    {
      question: t('subscription.onboarding.steps.password'),
      field: "password",
      type: "password",
      placeholder: t('subscription.onboarding.password.minChars'),
      maxLength: 50
    },
    {
      question: t('phoneContactLabel'),
      field: "phone",
      type: "tel",
      placeholder: t('subscription.onboarding.placeholders.phone'),
      maxLength: 15
    },
    {
      question: t('subscription.onboarding.steps.activity'),
      field: "activity",
      type: "select",
      options: [
        { value: "Electricista", label: t('categories.electrician') },
        { value: "Fontanero", label: t('categories.plumber') },
        { value: "Carpintero", label: t('categories.carpenter') },
        { value: "Albañil / Reformas", label: t('categories.builder') },
        { value: "Jardinero", label: t('categories.gardener') },
        { value: "Pintor", label: t('categories.painter') },
        { value: "Transportista", label: t('subscription.onboarding.activities.transporter') },
        { value: "Autónomo de limpieza", label: t('categories.cleaner') },
        { value: "Asesoría o gestoría", label: t('subscription.onboarding.activities.consultancy') },
        { value: "Empresa multiservicios", label: t('subscription.onboarding.activities.multiservice') },
        { value: "Otro tipo de servicio profesional", label: t('subscription.onboarding.activities.other') }
      ]
    },
    {
      question: t('fiscalAddress'),
      field: "address",
      type: "text",
      placeholder: t('subscription.onboarding.placeholders.address'),
      maxLength: 200
    }
  ];

  // Skip lastName for companies
  const currentStepIndex = currentStep;
  const currentStepData = steps[currentStepIndex];
  const shouldSkipStep = currentStepData?.skipIfEmpresa && formData.userType === "empresa";

  const progress = ((currentStep + 1) / steps.length) * 100;

  // Validation functions
  const validateNIF = (value) => {
    // NIF: 8 números + 1 letra (ej: 12345678A)
    const nifRegex = /^[0-9]{8}[A-Z]$/i;
    return nifRegex.test(value.toUpperCase());
  };

  const validateCIF = (value) => {
    // CIF: 1 letra + 7 números + 1 letra/número (ej: B12345678)
    const cifRegex = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/i;
    return cifRegex.test(value.toUpperCase());
  };

  const validateNIFCIF = (value) => {
    const cleaned = value.trim().toUpperCase();
    if (formData.userType === "empresa") {
      return validateCIF(cleaned);
    } else {
      return validateNIF(cleaned);
    }
  };

  const validatePhone = (value) => {
    // Acepta: 612345678, +34612345678, 912345678
    const cleaned = value.replace(/\s/g, '');
    const phoneRegex = /^(\+34)?[6789][0-9]{8}$/;
    return phoneRegex.test(cleaned);
  };

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validatePassword = (value) => {
    return value.length >= 8;
  };

  const validateName = (value) => {
    // Solo letras, espacios, guiones y tildes
    const nameRegex = /^[a-záéíóúñü\s-]+$/i;
    return value.length >= 2 && value.length <= 50 && nameRegex.test(value);
  };

  const validateCurrentStep = () => {
    const currentField = currentStepData.field;
    const value = formData[currentField];

    if (!value || (typeof value === 'string' && value.trim() === '')) {
      setError(t('subscription.onboarding.errors.required'));
      return false;
    }

    // Specific validations
    if (currentField === "firstName") {
      if (!validateName(value)) {
        setError(formData.userType === "empresa" 
          ? t('subscription.onboarding.errors.companyNameLength') 
          : t('subscription.onboarding.errors.firstNameInvalid'));
        return false;
      }
    }

    if (currentField === "lastName") {
      if (!validateName(value)) {
        setError(t('subscription.onboarding.errors.lastNameInvalid'));
        return false;
      }
    }

    if (currentField === "cifNif") {
      if (!validateNIFCIF(value)) {
        setError(formData.userType === "empresa"
          ? t('subscription.onboarding.errors.cifInvalid')
          : t('subscription.onboarding.errors.nifInvalid'));
        return false;
      }
    }

    if (currentField === "email" && !validateEmail(value)) {
      setError(t('subscription.onboarding.errors.emailInvalid'));
      return false;
    }

    if (currentField === "password" && !validatePassword(value)) {
      setError(t('subscription.onboarding.errors.passwordLength'));
      return false;
    }

    if (currentField === "phone" && !validatePhone(value)) {
      setError(t('subscription.onboarding.errors.phoneInvalid'));
      return false;
    }

    if (currentField === "activity" && value === "Otro tipo de servicio profesional" && !formData.activityOther.trim()) {
      setError(t('subscription.onboarding.errors.activityOtherRequired'));
      return false;
    }

    if (currentField === "address" && value.length < 10) {
      setError(t('subscription.onboarding.errors.addressLength'));
      return false;
    }

    return true;
  };

  const handleNext = () => {
    setError(null);

    if (shouldSkipStep) {
      // Skip this step for companies
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
      return;
    }

    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 0) {
      let prevStep = currentStep - 1;
      // Skip lastName for companies when going back
      if (steps[prevStep].skipIfEmpresa && formData.userType === "empresa") {
        prevStep--;
      }
      setCurrentStep(prevStep);
    }
  };

  const handleFieldChange = (field, value) => {
    // Apply max length for text inputs
    const currentStep = steps.find(s => s.field === field);
    if (currentStep?.maxLength && value.length > currentStep.maxLength) {
      return;
    }

    // Format phone number (remove non-numeric except +)
    if (field === "phone") {
      value = value.replace(/[^\d+]/g, '');
    }

    // Format NIF/CIF to uppercase
    if (field === "cifNif") {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    setFormData({ ...formData, [field]: value });
    setError(null);
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Build full name
      const fullName = formData.userType === "empresa" 
        ? formData.firstName 
        : `${formData.firstName} ${formData.lastName}`.trim();

      // Validate all fields
      if (!fullName || !formData.cifNif || !formData.email || !formData.password || !formData.phone || !formData.activity || !formData.address) {
        setError(t('subscription.onboarding.errors.allFieldsRequired'));
        setIsProcessing(false);
        return;
      }

      if (formData.activity === "Otro tipo de servicio profesional" && !formData.activityOther.trim()) {
        setError(t('subscription.onboarding.errors.activityOtherRequired'));
        setIsProcessing(false);
        return;
      }

      // Final validations
      if (formData.userType !== "empresa" && !validateName(formData.firstName)) {
        setError(t('subscription.onboarding.errors.firstNameChars'));
        setIsProcessing(false);
        return;
      }

      if (formData.userType !== "empresa" && !validateName(formData.lastName)) {
        setError(t('subscription.onboarding.errors.lastNameChars'));
        setIsProcessing(false);
        return;
      }

      if (!validateNIFCIF(formData.cifNif)) {
        setError(t('subscription.onboarding.errors.nifCifInvalid'));
        setIsProcessing(false);
        return;
      }

      if (!validateEmail(formData.email)) {
        setError(t('subscription.onboarding.errors.emailShort'));
        setIsProcessing(false);
        return;
      }

      if (!validatePassword(formData.password)) {
        setError(t('subscription.onboarding.errors.passwordLength'));
        setIsProcessing(false);
        return;
      }

      if (!validatePhone(formData.phone)) {
        setError(t('subscription.onboarding.errors.phoneShort'));
        setIsProcessing(false);
        return;
      }

      // Create Stripe checkout session
      const response = await base44.functions.invoke('createCheckoutSession', {
        email: formData.email,
        fullName: fullName,
        userType: formData.userType,
        cifNif: formData.cifNif,
        phone: formData.phone,
        activity: formData.activity,
        activityOther: formData.activityOther,
        address: formData.address,
        paymentMethod: formData.paymentMethod,
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Redirect to Stripe Checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No se pudo crear la sesión de pago');
      }

    } catch (error) {
      console.error("Error:", error);
      setError(t('subscription.onboarding.errors.temporary'));
      setIsProcessing(false);
    }
  };

  const getCharacterCount = (field) => {
    const value = formData[field] || "";
    const maxLength = steps.find(s => s.field === field)?.maxLength || 0;
    return { current: value.length, max: maxLength };
  };

  // Success screen
  if (currentStep === steps.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-0 shadow-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {t('subscription.onboarding.success.title')}
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              {t('subscription.onboarding.success.activated')}
            </p>
            <p className="text-lg text-gray-600 mb-8">
              {t('subscription.onboarding.success.emailSent', { email: formData.email })}
            </p>
            <div className="bg-blue-50 p-6 rounded-xl mb-6 text-left">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                {t('subscription.onboarding.success.nextSteps')}
              </p>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{t('subscription.onboarding.success.stepConfirmEmail')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{t('subscription.onboarding.success.stepCompleteProfile')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{t('subscription.onboarding.success.stepAddPhotos')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{t('subscription.onboarding.success.stepGetClients')}</span>
                </li>
              </ul>
            </div>
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 px-8"
              onClick={() => {
                base44.auth.redirectToLogin(createPageUrl("MyProfile"));
              }}
            >
              {t('subscription.onboarding.success.goToPanel')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Skip step if needed
  if (shouldSkipStep) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-white text-sm font-medium">
              {t('subscription.onboarding.progress.step', { current: currentStep + 1, total: steps.length })}
            </span>
            <span className="text-white text-sm font-medium">
              {t('subscription.onboarding.progress.completed', { percent: Math.round(progress) })}
            </span>
          </div>
          <Progress value={progress} className="h-3 bg-blue-900 rounded-full" />
        </div>

        {/* Question Card */}
        <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
              {currentStepData.question}
            </h2>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              {currentStepData.type === "choice" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentStepData.options.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData[currentStepData.field] === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          handleFieldChange(currentStepData.field, option.value);
                        }}
                        className={`p-8 border-2 rounded-2xl transition-all duration-300 ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 shadow-lg scale-105"
                            : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                        }`}
                      >
                        <Icon className={`w-16 h-16 mx-auto mb-4 transition-colors ${
                          isSelected ? "text-blue-600" : "text-gray-400"
                        }`} />
                        <p className={`text-lg font-semibold transition-colors ${
                          isSelected ? "text-blue-900" : "text-gray-700"
                        }`}>{option.label}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {(currentStepData.type === "text" || currentStepData.type === "nif") && (
                <div>
                  <Input
                    type="text"
                    value={formData[currentStepData.field]}
                    onChange={(e) => handleFieldChange(currentStepData.field, e.target.value)}
                    placeholder={currentStepData.placeholder}
                    className="h-14 text-lg border-2 rounded-xl focus:border-blue-600"
                    maxLength={currentStepData.maxLength}
                    autoFocus
                  />
                  {currentStepData.maxLength && (
                    <p className="text-sm text-gray-500 mt-2">
                      {t('subscription.onboarding.fields.charCount', { current: getCharacterCount(currentStepData.field).current, max: currentStepData.maxLength })}
                    </p>
                  )}
                  {currentStepData.type === "nif" && (
                    <p className="text-sm text-gray-500 mt-2">
                      {formData.userType === "empresa" ? t('subscription.onboarding.fields.cifFormat') : t('subscription.onboarding.fields.nifFormat')}
                    </p>
                  )}
                </div>
              )}

              {currentStepData.type === "email" && (
                <div>
                  <Input
                    type="email"
                    value={formData[currentStepData.field]}
                    onChange={(e) => handleFieldChange(currentStepData.field, e.target.value)}
                    placeholder={currentStepData.placeholder}
                    className="h-14 text-lg border-2 rounded-xl focus:border-blue-600"
                    maxLength={currentStepData.maxLength}
                    autoFocus
                  />
                  {currentStepData.maxLength && (
                    <p className="text-sm text-gray-500 mt-2">
                      {t('subscription.onboarding.fields.charCount', { current: getCharacterCount(currentStepData.field).current, max: currentStepData.maxLength })}
                    </p>
                  )}
                </div>
              )}

              {currentStepData.type === "password" && (
                <div>
                  <Input
                    type="password"
                    value={formData[currentStepData.field]}
                    onChange={(e) => handleFieldChange(currentStepData.field, e.target.value)}
                    placeholder={currentStepData.placeholder}
                    className="h-14 text-lg border-2 rounded-xl focus:border-blue-600"
                    maxLength={currentStepData.maxLength}
                    autoFocus
                  />
                  <div className="mt-2 space-y-1">
                    <p className={`text-sm ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                      {formData.password.length >= 8 ? '✓' : '○'} {t('subscription.onboarding.password.minChars')}
                    </p>
                  </div>
                </div>
              )}

              {currentStepData.type === "tel" && (
                <div>
                  <Input
                    type="tel"
                    value={formData[currentStepData.field]}
                    onChange={(e) => handleFieldChange(currentStepData.field, e.target.value)}
                    placeholder={currentStepData.placeholder}
                    className="h-14 text-lg border-2 rounded-xl focus:border-blue-600"
                    maxLength={currentStepData.maxLength}
                    autoFocus
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    {t('subscription.onboarding.fields.phoneFormats')}
                  </p>
                </div>
              )}

              {currentStepData.type === "select" && (
                <>
                  <Select
                    value={formData[currentStepData.field]}
                    onValueChange={(value) => handleFieldChange(currentStepData.field, value)}
                  >
                    <SelectTrigger className="h-14 text-lg border-2 rounded-xl focus:border-blue-600">
                      <SelectValue placeholder={t('subscription.onboarding.fields.selectOption')} />
                    </SelectTrigger>
                    <SelectContent>
                      {currentStepData.options.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-lg py-3">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {currentStepData.field === "activity" && formData.activity === "Otro tipo de servicio profesional" && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                      <Label className="text-gray-900 mb-2 block font-medium">
                        {t('subscription.onboarding.fields.specifyActivity')}
                      </Label>
                      <Input
                        type="text"
                        value={formData.activityOther}
                        onChange={(e) => handleFieldChange('activityOther', e.target.value.slice(0, 50))}
                        placeholder={t('subscription.onboarding.placeholders.activityOther')}
                        maxLength={50}
                        className="h-12 text-base border-2 rounded-xl"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        {t('subscription.onboarding.fields.charCount', { current: formData.activityOther.length, max: 50 })}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Payment info for last step */}
            {currentStep === steps.length - 1 && (
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    {t('subscription.onboarding.plan.selected')}
                  </p>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {t('subscription.onboarding.plan.mostPopular')}
                  </Badge>
                </div>
                <div className="mb-2">
                  <p className="text-xs font-semibold text-green-600 mb-1">{t('subscription.onboarding.plan.freeTrial')}</p>
                  <p className="text-3xl font-bold text-blue-900">
                    <Trans
                      i18nKey="subscription.onboarding.plan.firstMonthPrice"
                      components={{ muted: <span className="text-base font-normal text-gray-500" /> }}
                    />
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{t('subscription.onboarding.plan.thenPrice')}</p>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {t('subscription.onboarding.plan.fullAccess')}
                </p>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{t('subscription.onboarding.plan.featureSearch')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{t('subscription.onboarding.plan.featureProfile')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{t('pricing.free.includes.unlimitedMessages')}</span>
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-xs text-gray-600">
                    {t('subscription.onboarding.plan.securePayment')}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleBack}
                  className="flex-1 h-14 border-2 rounded-xl hover:bg-gray-50"
                  disabled={isProcessing}
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  {t('subscription.onboarding.nav.back')}
                </Button>
              )}
              <Button
                size="lg"
                onClick={handleNext}
                disabled={isProcessing || !formData[currentStepData.field]}
                className={`h-14 rounded-xl font-semibold text-base shadow-lg transition-all ${
                  currentStep > 0 ? 'flex-1' : 'w-full'
                } ${
                  !formData[currentStepData.field] 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('subscription.actions.processing')}
                  </>
                ) : currentStep === steps.length - 1 ? (
                  <>
                    {t('subscription.onboarding.nav.continueToPayment')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    {t('subscription.onboarding.nav.continue')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help text */}
        <p className="text-center text-white text-sm mt-6 opacity-90">
          {t('subscription.onboarding.footer.secure')}
        </p>
      </div>
    </div>
  );
}
